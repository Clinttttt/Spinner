namespace Spinner.Api.Features.Notifications.ProcessNotificationOutbox;

public sealed class NotificationOutboxOptions
{
    public const string SectionName = "NotificationOutbox";

    public bool Enabled { get; set; } = true;
    public int BatchSize { get; set; } = 20;
    public int MaxAttempts { get; set; } = 3;
    public int PollIntervalSeconds { get; set; } = 30;
}
