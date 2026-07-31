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
            $"<p>{encodedMessage}</p>"));

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

    private sealed record ResendEmailRequest(
        string From,
        string[] To,
        string Subject,
        string Text,
        string Html);
}
