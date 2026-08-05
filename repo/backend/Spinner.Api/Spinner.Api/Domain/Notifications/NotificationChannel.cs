namespace Spinner.Api.Domain.Notifications;

public enum NotificationChannel
{
    Sms,
    Email,

    /// <summary>
    /// A push notification to one of the shop's own devices.
    /// </summary>
    /// <remarks>
    /// The only channel aimed at staff rather than customers, so its recipient is a
    /// device registration token instead of a phone number or email address. Carried on
    /// the same outbox as everything else, which means it inherits the retry limit and
    /// the claim that stops a message being sent twice.
    /// </remarks>
    Push
}
