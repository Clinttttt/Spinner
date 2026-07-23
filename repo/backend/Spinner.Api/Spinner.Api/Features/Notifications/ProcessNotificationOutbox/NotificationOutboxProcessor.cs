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

    public async Task<int> ProcessPendingAsync(CancellationToken cancellationToken)
    {
        var batchSize = Math.Max(1, _options.BatchSize);
        var maxAttempts = Math.Max(1, _options.MaxAttempts);

        var messages = await _dbContext.NotificationOutboxMessages
            .Where(message =>
                message.Status == NotificationStatus.Pending ||
                (message.Status == NotificationStatus.Failed && message.AttemptCount < maxAttempts))
            .OrderBy(message => message.CreatedAt)
            .Take(batchSize)
            .ToListAsync(cancellationToken);

        foreach (var message in messages)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var now = DateTimeOffset.UtcNow;

            try
            {
                var result = await _notificationSender.SendAsync(message, cancellationToken);

                if (result.IsSuccess)
                {
                    message.MarkSent(now);
                }
                else
                {
                    message.MarkFailed(result.ErrorMessage ?? "Notification provider rejected the message.", now);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Notification {NotificationId} failed while sending.",
                    message.Id);

                message.MarkFailed(ex.Message, now);
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return messages.Count;
    }
}
