using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using Spinner.Api.Domain.Notifications;

namespace Spinner.Api.Integrations.Notifications;

public sealed class ResendNotificationSender : IEmailNotificationSender
{
    private readonly HttpClient _httpClient;
    private readonly ResendOptions _options;
    private readonly ILogger<ResendNotificationSender> _logger;

    public ResendNotificationSender(
        HttpClient httpClient,
        IOptions<ResendOptions> options,
        ILogger<ResendNotificationSender> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<NotificationSendResult> SendAsync(
        NotificationOutboxMessage message,
        CancellationToken cancellationToken)
    {
        if (message.Channel != NotificationChannel.Email)
            return NotificationSendResult.Failure("Resend only supports email notifications.");

        var subject = string.IsNullOrWhiteSpace(message.Subject)
            ? _options.DefaultSubject
            : message.Subject;
        var from = string.IsNullOrWhiteSpace(_options.FromName)
            ? _options.FromEmail
            : $"{_options.FromName} <{_options.FromEmail}>";
        var encodedMessage = WebUtility.HtmlEncode(message.Message)
            .Replace("\r\n", "<br />", StringComparison.Ordinal)
            .Replace("\n", "<br />", StringComparison.Ordinal);

        using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        request.Headers.TryAddWithoutValidation(
            "Idempotency-Key",
            $"spinner-notification-{message.Id:N}");
        request.Content = JsonContent.Create(new ResendEmailRequest(
            from,
            [message.Recipient],
            subject,
            message.Message,
            BuildHtml(encodedMessage)));

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
            return NotificationSendResult.Success();

        _logger.LogWarning(
            "Resend rejected notification {NotificationId} with HTTP status {StatusCode}.",
            message.Id,
            (int)response.StatusCode);

        return NotificationSendResult.Failure(
            $"Resend rejected email delivery with HTTP status {(int)response.StatusCode}.");
    }

    /// <summary>
    /// Wraps the message in the shop's own letterhead.
    /// </summary>
    /// <remarks>
    /// Emails went out as a bare paragraph, which read as a system notice rather than
    /// something the laundromat had sent. A logo and the shop's name make a receipt or a
    /// booking confirmation recognisable at a glance.
    ///
    /// Written as tables with inline styles on purpose. Mail clients are not browsers: Outlook
    /// ignores most of a stylesheet and several strip anything in a head block, so layout that
    /// works everywhere is the layout email had twenty years ago.
    ///
    /// The plain text part is still sent alongside this, so a client that shows no HTML, and
    /// anyone who blocks images, still gets the whole message.
    /// </remarks>
    private string BuildHtml(string encodedMessage)
    {
        // The sender name the deployment configured, which startup validation insists on
        // outside development. The fallback carries no shop's name: a generic letterhead is
        // honest, whereas one shop's name on another shop's receipt is not.
        var shopName = WebUtility.HtmlEncode(
            string.IsNullOrWhiteSpace(_options.FromName)
                ? "Laundry Service"
                : _options.FromName);

        var logo = string.IsNullOrWhiteSpace(_options.LogoUrl)
            ? string.Empty
            : $"""
              <tr>
                <td align="center" style="padding:0 0 18px 0;">
                  <img src="{WebUtility.HtmlEncode(_options.LogoUrl)}" width="64" height="64"
                       alt="{shopName}"
                       style="display:block;border:0;border-radius:16px;" />
                </td>
              </tr>
              """;

        return $"""
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                   style="background:#f4f7fb;padding:24px 12px;">
              <tr>
                <td align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                         style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:26px 24px;font-family:Arial,Helvetica,sans-serif;">
                    {logo}
                    <tr>
                      <td align="center" style="padding:0 0 16px 0;color:#0d2a52;font-size:16px;font-weight:bold;">
                        {shopName}
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#334155;font-size:14px;line-height:22px;">
                        {encodedMessage}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:22px 0 0 0;border-top:1px solid #eef2f7;color:#8391a5;font-size:11px;line-height:17px;">
                        Sent by {shopName}. Please do not reply to this address.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            """;
    }

    private sealed record ResendEmailRequest(
        string From,
        string[] To,
        string Subject,
        string Text,
        string Html);
}
