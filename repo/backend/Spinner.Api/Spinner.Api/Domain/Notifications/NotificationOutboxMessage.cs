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

    public void MarkSent(DateTimeOffset now)
    {
        AttemptCount++;
        Status = NotificationStatus.Sent;
        LastError = null;
        SentAt = now;
    }

    public void MarkFailed(string error, DateTimeOffset now)
    {
        AttemptCount++;
        Status = NotificationStatus.Failed;
        LastError = string.IsNullOrWhiteSpace(error) ? "Notification send failed." : error.Trim();
        SentAt = null;
    }
}
