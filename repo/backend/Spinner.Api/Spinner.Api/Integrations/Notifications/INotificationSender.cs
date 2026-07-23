using Spinner.Api.Domain.Notifications;

namespace Spinner.Api.Integrations.Notifications;

public interface INotificationSender
{
    Task<NotificationSendResult> SendAsync(
        NotificationOutboxMessage message,
        CancellationToken cancellationToken);
}
