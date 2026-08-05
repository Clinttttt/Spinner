using Microsoft.Extensions.Options;
using Spinner.Api.Domain.Notifications;

namespace Spinner.Api.Integrations.Notifications;

public sealed class NotificationSenderRouter : INotificationSender
{
    private readonly IEmailNotificationSender _emailSender;
    private readonly FirebaseCloudMessagingSender _pushSender;
    private readonly LoggingNotificationSender _loggingSender;
    private readonly NotificationDeliveryOptions _options;

    public NotificationSenderRouter(
        IEmailNotificationSender emailSender,
        FirebaseCloudMessagingSender pushSender,
        LoggingNotificationSender loggingSender,
        IOptions<NotificationDeliveryOptions> options)
    {
        _emailSender = emailSender;
        _pushSender = pushSender;
        _loggingSender = loggingSender;
        _options = options.Value;
    }

    public Task<NotificationSendResult> SendAsync(
        NotificationOutboxMessage message,
        CancellationToken cancellationToken)
    {
        // Push goes to Firebase, which reports for itself when it is not configured. SMS
        // still has no provider and falls through to the log, as before.
        if (message.Channel == NotificationChannel.Push)
            return _pushSender.SendAsync(message, cancellationToken);

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
