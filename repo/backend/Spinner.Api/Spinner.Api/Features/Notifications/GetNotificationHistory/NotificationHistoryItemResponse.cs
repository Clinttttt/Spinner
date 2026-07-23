using Spinner.Api.Domain.Notifications;

namespace Spinner.Api.Features.Notifications.GetNotificationHistory;

public sealed record NotificationHistoryItemResponse(
    Guid NotificationId,
    Guid OrderId,
    string? OrderCode,
    NotificationChannel Channel,
    string Recipient,
    string? Subject,
    string Message,
    NotificationStatus Status,
    int AttemptCount,
    string? LastError,
    DateTimeOffset CreatedAt,
    DateTimeOffset? SentAt);
