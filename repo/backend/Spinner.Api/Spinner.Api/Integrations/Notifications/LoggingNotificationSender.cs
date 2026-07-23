using Spinner.Api.Domain.Notifications;

namespace Spinner.Api.Integrations.Notifications;

public sealed class LoggingNotificationSender : INotificationSender
{
    private readonly ILogger<LoggingNotificationSender> _logger;

    public LoggingNotificationSender(ILogger<LoggingNotificationSender> logger)
    {
        _logger = logger;
    }

    public Task<NotificationSendResult> SendAsync(
        NotificationOutboxMessage message,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Notification outbox simulated send. Channel: {Channel}; Recipient: {Recipient}; Subject: {Subject}",
            message.Channel,
            message.Recipient,
            message.Subject);

        return Task.FromResult(NotificationSendResult.Success());
    }
}
