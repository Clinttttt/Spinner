namespace Spinner.Api.Features.Notifications.ProcessNotificationOutbox;

public sealed class NotificationOutboxOptions
{
    public const string SectionName = "NotificationOutbox";

    public bool Enabled { get; set; } = true;
    public int BatchSize { get; set; } = 20;
    public int MaxAttempts { get; set; } = 3;
    public int PollIntervalSeconds { get; set; } = 30;

    /// <summary>
    /// How long a worker's claim on a message holds before another worker may retry it.
    /// </summary>
    /// <remarks>
    /// Long enough that a slow provider call cannot have its message stolen mid-send,
    /// short enough that a worker killed mid-batch does not strand a customer's
    /// notification for long.
    /// </remarks>
    public int ClaimMinutes { get; set; } = 5;

    /// <summary>
    /// The wait before a failed message is tried again, doubling with each attempt.
    /// </summary>
    /// <remarks>
    /// Two minutes then four, so three attempts span roughly six minutes rather than the
    /// minute they took when nothing held a failure back. A provider having a bad moment
    /// is then ridden out instead of spending the whole attempt limit before it recovers.
    /// A resend requested by the owner ignores this and goes at once.
    /// </remarks>
    public int RetryBackoffMinutes { get; set; } = 2;
}
