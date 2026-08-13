namespace Spinner.Api.Integrations.Notifications;

public sealed class ResendOptions
{
    public const string SectionName = "Resend";

    public string BaseUrl { get; set; } = "https://api.resend.com/";
    public string ApiKey { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "Engr. Spin Laundromat";
    public string DefaultSubject { get; set; } = "Engr. Spin Laundromat Update";

    /// <summary>
    /// Publicly reachable image shown at the top of every email.
    /// </summary>
    /// <remarks>
    /// Must be a URL a mail client can fetch, so it is served by the customer site rather
    /// than bundled with the API. Empty means the emails go out without it, which is the
    /// right default: a broken image in a receipt looks worse than no image.
    ///
    /// Note this is the logo inside the message, not the round avatar a mail app shows beside
    /// the sender's name. That avatar comes from the mail provider — Gmail draws it from BIMI,
    /// which needs a registered trademark and a paid certificate — and cannot be set from the
    /// message itself.
    /// </remarks>
    public string LogoUrl { get; set; } = string.Empty;
}
