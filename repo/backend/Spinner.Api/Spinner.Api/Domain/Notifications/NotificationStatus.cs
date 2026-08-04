namespace Spinner.Api.Domain.Notifications;

public enum NotificationStatus
{
    Pending,
    Sent,
    Failed,

    /// <summary>
    /// Claimed by a worker and currently being sent.
    /// </summary>
    /// <remarks>
    /// Added so a message in flight is visibly not available. Previously a message
    /// stayed Pending for the whole duration of the send, so anything else looking
    /// for work could pick it up and send the customer a duplicate.
    /// </remarks>
    Processing
}
