using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Integrations.Notifications;

namespace Spinner.Api.Features.Notifications.ProcessNotificationOutbox;

public sealed class NotificationOutboxProcessor
{
    private readonly AppDbContext _dbContext;
    private readonly INotificationSender _notificationSender;
    private readonly NotificationOutboxOptions _options;
    private readonly ILogger<NotificationOutboxProcessor> _logger;

    public NotificationOutboxProcessor(
        AppDbContext dbContext,
        INotificationSender notificationSender,
        IOptions<NotificationOutboxOptions> options,
        ILogger<NotificationOutboxProcessor> logger)
    {
        _dbContext = dbContext;
        _notificationSender = notificationSender;
        _options = options.Value;
        _logger = logger;
    }

    /// <summary>
    /// Sends whatever is waiting, claiming each message before it goes out.
    /// </summary>
    /// <remarks>
    /// The claim is the point of this method. Messages used to be selected as
    /// Pending, sent, and only then marked, which left two ways for a customer to
    /// receive the same message twice: a second worker could select the same rows
    /// while the first was still sending, and a crash between sending and saving left
    /// the row Pending so it was sent again on the next tick.
    ///
    /// Claiming is a single conditional UPDATE, so exactly one worker's claim id can
    /// land on a row. The lease means a worker that dies does not stall the message
    /// for ever — it becomes claimable again once the lease lapses.
    /// </remarks>
    public async Task<int> ProcessPendingAsync(CancellationToken cancellationToken)
    {
        var batchSize = Math.Max(1, _options.BatchSize);
        var maxAttempts = Math.Max(1, _options.MaxAttempts);
        var now = DateTimeOffset.UtcNow;

        var messages = await ClaimBatchAsync(batchSize, maxAttempts, now, cancellationToken);

        foreach (var message in messages)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var sentAt = DateTimeOffset.UtcNow;

            try
            {
                var result = await _notificationSender.SendAsync(message, cancellationToken);

                if (result.IsSuccess)
                {
                    message.MarkSent(sentAt);
                }
                else
                {
                    message.MarkFailed(
                        result.ErrorMessage ?? "Notification provider rejected the message.",
                        sentAt,
                        RetryDelayFor(message.AttemptCount));
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Notification {NotificationId} failed while sending.",
                    message.Id);

                message.MarkFailed(ex.Message, sentAt, RetryDelayFor(message.AttemptCount));
            }

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Another worker re-claimed this message while it was in flight, which can
                // only happen when the send outlasts the lease. Two things had to be
                // handled here rather than letting it throw.
                //
                // The exception escaped the loop, so every message claimed after this one
                // was abandoned mid-batch and sat as Processing until its own lease
                // lapsed. On a deploy, where two revisions overlap briefly, that could
                // stall a whole batch of receipts.
                //
                // And a failed save leaves the entity tracked with the stamp it read, so
                // the next message's save would be rejected for this message's conflict,
                // and so would every one after it. Detaching is what lets the loop go on.
                //
                // The outcome is deliberately not forced through: the row belongs to the
                // other worker now, and overwriting it would let the two disagree about
                // whether the customer was actually written to.
                _logger.LogWarning(
                    "Notification {NotificationId} finished after its lease expired. Another worker owns it, so the outcome was not recorded and the message may be sent again. Consider raising NotificationOutbox:ClaimMinutes.",
                    message.Id);

                _dbContext.Entry(message).State = EntityState.Detached;
            }
        }

        return messages.Count;
    }

    /// <summary>
    /// How long to hold a message back before the attempt after this one.
    /// </summary>
    /// <remarks>
    /// Doubling, from the attempt that has just failed: two minutes, then four. Taken from
    /// the count before <see cref="NotificationOutboxMessage.MarkFailed"/> increments it.
    /// </remarks>
    private TimeSpan RetryDelayFor(int attemptsAlreadyMade)
    {
        var baseMinutes = Math.Max(0, _options.RetryBackoffMinutes);
        if (baseMinutes == 0) return TimeSpan.Zero;

        // Capped so a large MaxAttempts cannot overflow into an absurd wait.
        var doublings = Math.Min(attemptsAlreadyMade, 6);

        return TimeSpan.FromMinutes(baseMinutes * Math.Pow(2, doublings));
    }

    /// <summary>
    /// Takes ownership of up to <paramref name="batchSize"/> waiting messages.
    /// </summary>
    /// <remarks>
    /// Claimed one at a time on purpose. Two workers can read the same waiting
    /// message, but the concurrency stamp means only the first save succeeds; the
    /// loser is told so and moves on. Claiming the whole batch in one save would make
    /// a single conflict throw away the rest of the batch.
    /// </remarks>
    private async Task<List<NotificationOutboxMessage>> ClaimBatchAsync(
        int batchSize,
        int maxAttempts,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var lockedUntil = now.AddMinutes(Math.Max(1, _options.ClaimMinutes));

        var candidates = await _dbContext.NotificationOutboxMessages
            // The order is needed so a push can carry its code, which is what lets
            // tapping the notification open that order rather than a bare list.
            .Include(message => message.Order)
            .Where(message =>
                message.Status == NotificationStatus.Pending ||
                // Mirrors NotificationOutboxMessage.IsClaimable: a failed message waits out
                // its backoff. Without the LockedUntil test here the query would hand back
                // messages the domain considers unavailable, and the wait would do nothing.
                (message.Status == NotificationStatus.Failed &&
                    message.AttemptCount < maxAttempts &&
                    (message.LockedUntil == null || message.LockedUntil <= now)) ||
                (message.Status == NotificationStatus.Processing &&
                    (message.LockedUntil == null || message.LockedUntil <= now)))
            .OrderBy(message => message.CreatedAt)
            .Take(batchSize)
            .ToListAsync(cancellationToken);

        var claimed = new List<NotificationOutboxMessage>(candidates.Count);

        foreach (var message in candidates)
        {
            message.Claim(Guid.NewGuid(), lockedUntil);

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
                claimed.Add(message);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Another worker got there first. Not an error worth alarming about:
                // the message is being handled, just not by this run.
                _logger.LogDebug(
                    "Notification {NotificationId} was claimed by another worker.",
                    message.Id);

                await _dbContext.Entry(message).ReloadAsync(cancellationToken);
            }
        }

        return claimed;
    }
}
