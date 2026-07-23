namespace Spinner.Api.Integrations.Notifications;

public sealed record NotificationSendResult(bool IsSuccess, string? ErrorMessage)
{
    public static NotificationSendResult Success() => new(true, null);

    public static NotificationSendResult Failure(string errorMessage) => new(false, errorMessage);
}
