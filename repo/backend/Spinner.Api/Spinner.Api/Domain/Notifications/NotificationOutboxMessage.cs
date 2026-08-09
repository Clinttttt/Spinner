using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Domain.Notifications;

public sealed class NotificationOutboxMessage
{
    private NotificationOutboxMessage()
    {
    }

    public NotificationOutboxMessage(
        Guid orderId,
        NotificationChannel channel,
        string recipient,
        string? subject,
        string message,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        OrderId = orderId;
        Channel = channel;
        Recipient = recipient.Trim();
        Subject = string.IsNullOrWhiteSpace(subject) ? null : subject.Trim();
        Message = message.Trim();
        Status = NotificationStatus.Pending;
        AttemptCount = 0;
        CreatedAt = now;
    }

    public NotificationOutboxMessage(
        NotificationChannel channel,
        string recipient,
        string? subject,
        string message,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        Channel = channel;
        Recipient = recipient.Trim();
        Subject = string.IsNullOrWhiteSpace(subject) ? null : subject.Trim();
        Message = message.Trim();
        Status = NotificationStatus.Pending;
        AttemptCount = 0;
        CreatedAt = now;
    }

    public Guid Id { get; private set; }
    public Guid? OrderId { get; private set; }
    public LaundryOrder? Order { get; private set; }
    public NotificationChannel Channel { get; private set; }
    public string Recipient { get; private set; } = string.Empty;
    public string? Subject { get; private set; }
    public string Message { get; private set; } = string.Empty;
    public NotificationStatus Status { get; private set; }
    public int AttemptCount { get; private set; }
    public string? LastError { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? SentAt { get; private set; }

    /// <summary>Which worker run currently owns this message.</summary>
    public Guid? ClaimId { get; private set; }

    /// <summary>When the current claim lapses and the message may be retried.</summary>
    public DateTimeOffset? LockedUntil { get; private set; }

    /// <summary>
    /// Changes on every claim, and is configured as a concurrency token.
    /// </summary>
    /// <remarks>
    /// This is what makes claiming safe. Two workers can read the same waiting
    /// message, but only the first save will match the stamp it read; the second is
    /// rejected, so the message cannot be sent twice.
    /// </remarks>
    public Guid ConcurrencyStamp { get; private set; } = Guid.NewGuid();

    /// <summary>
    /// Whether this message may be picked up for sending.
    /// </summary>
    /// <remarks>
    /// A message being processed is off limits until its lease expires. Without that,
    /// a second worker — or the next tick of the same one — could pick up a message
    /// already in flight and send the customer a second copy.
    /// </remarks>
    public bool IsClaimable(DateTimeOffset now, int maxAttempts) => Status switch
    {
        NotificationStatus.Pending => true,
        NotificationStatus.Failed => AttemptCount < maxAttempts,
        NotificationStatus.Processing => LockedUntil is null || LockedUntil <= now,
        _ => false
    };

    public void Claim(Guid claimId, DateTimeOffset lockedUntil)
    {
        Status = NotificationStatus.Processing;
        ClaimId = claimId;
        LockedUntil = lockedUntil;
        ConcurrencyStamp = Guid.NewGuid();
    }

    public void MarkSent(DateTimeOffset now)
    {
        AttemptCount++;
        Status = NotificationStatus.Sent;
        LastError = null;
        SentAt = now;
        ClaimId = null;
        LockedUntil = null;
        ConcurrencyStamp = Guid.NewGuid();
    }

    public void MarkFailed(string error, DateTimeOffset now)
    {
        AttemptCount++;
        Status = NotificationStatus.Failed;
        LastError = string.IsNullOrWhiteSpace(error) ? "Notification send failed." : error.Trim();
        SentAt = null;
        ClaimId = null;
        LockedUntil = null;
        ConcurrencyStamp = Guid.NewGuid();
    }

    /// <summary>
    /// Puts a message that gave up back in the queue.
    /// </summary>
    /// <remarks>
    /// A message that exhausts its attempts is otherwise finished for good, which is
    /// right when the address is genuinely undeliverable and wrong when the fault was
    /// ours. Sending from an unverified domain rejected every customer receipt for weeks,
    /// and those messages were unrecoverable even after the cause was fixed.
    ///
    /// The attempt count is reset rather than merely incremented, because the retry limit
    /// exists to stop a doomed message being retried for ever — and the owner asking for
    /// this is a deliberate act, not a loop.
    ///
    /// A message already sent is refused. Resending it would deliver a second copy of a
    /// receipt the customer already has.
    /// </remarks>
    public Result Requeue(DateTimeOffset now)
    {
        if (Status == NotificationStatus.Sent)
            return Result.Conflict("This message was already delivered.");

        if (Status == NotificationStatus.Processing && LockedUntil > now)
            return Result.Conflict("This message is being sent right now.");

        Status = NotificationStatus.Pending;
        AttemptCount = 0;
        LastError = null;
        SentAt = null;
        ClaimId = null;
        LockedUntil = null;
        ConcurrencyStamp = Guid.NewGuid();

        return Result.Success();
    }
}
