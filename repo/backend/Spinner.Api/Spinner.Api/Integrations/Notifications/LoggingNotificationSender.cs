using Spinner.Api.Domain.Notifications;

namespace Spinner.Api.Integrations.Notifications;

public sealed class LoggingNotificationSender : INotificationSender
{
    private readonly ILogger<LoggingNotificationSender> _logger;
    private readonly IHostEnvironment _environment;

    public LoggingNotificationSender(
        ILogger<LoggingNotificationSender> logger,
        IHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
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

        if (_environment.IsDevelopment())
        {
            _logger.LogInformation(
                "Development notification body for {Recipient}: {Message}",
                message.Recipient,
                message.Message);
        }

        return Task.FromResult(NotificationSendResult.Success());
    }
}
