namespace Spinner.Api.Integrations.Notifications;

public sealed class NotificationDeliveryOptions
{
    public const string SectionName = "NotificationDelivery";
    public const string LoggingProvider = "Logging";
    public const string ResendProvider = "Resend";

    public string EmailProvider { get; set; } = ResendProvider;
    public string SmsProvider { get; set; } = LoggingProvider;
}
