namespace Spinner.Api.Integrations.Notifications;

public sealed class ResendOptions
{
    public const string SectionName = "Resend";

    public string BaseUrl { get; set; } = "https://api.resend.com/";
    public string ApiKey { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "Engr. Spin Laundromat";
    public string DefaultSubject { get; set; } = "Engr. Spin Laundromat Update";
}
