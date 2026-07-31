using Microsoft.Extensions.Options;
using Spinner.Api.Domain.Notifications;

namespace Spinner.Api.Integrations.Notifications;

public sealed class NotificationSenderRouter : INotificationSender
{
    private readonly IEmailNotificationSender _emailSender;
    private readonly LoggingNotificationSender _loggingSender;
    private readonly NotificationDeliveryOptions _options;

    public NotificationSenderRouter(
        IEmailNotificationSender emailSender,
        LoggingNotificationSender loggingSender,
        IOptions<NotificationDeliveryOptions> options)
    {
        _emailSender = emailSender;
        _loggingSender = loggingSender;
        _options = options.Value;
    }

    public Task<NotificationSendResult> SendAsync(
        NotificationOutboxMessage message,
        CancellationToken cancellationToken)
    {
        if (message.Channel == NotificationChannel.Email &&
            string.Equals(
                _options.EmailProvider,
                NotificationDeliveryOptions.ResendProvider,
                StringComparison.OrdinalIgnoreCase))
        {
            return _emailSender.SendAsync(message, cancellationToken);
        }

        return _loggingSender.SendAsync(message, cancellationToken);
    }
}
