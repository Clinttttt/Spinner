using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Spinner.Api.Domain.Notifications;

namespace Spinner.Api.Integrations.Notifications;

/// <summary>
/// Sends a push notification through Firebase Cloud Messaging.
/// </summary>
/// <remarks>
/// Uses the HTTP v1 API, which addresses one device per request. That suits a single
/// laundromat, where the shop has a handful of phones rather than a mailing list, and it
/// means one dead token cannot spoil delivery to the others.
///
/// The distinction that matters here is between a message worth retrying and a device
/// worth giving up on. A network blip should be tried again; a token Firebase has
/// declared unknown never will be, and retrying it three times per booking for ever is
/// just noise. The latter is reported as a permanent failure and the device is retired.
/// </remarks>
public sealed class FirebaseCloudMessagingSender
{
    private readonly HttpClient _httpClient;
    private readonly IFirebaseAccessTokenProvider _tokenProvider;
    private readonly IStaffDeviceRegistry _devices;
    private readonly FirebaseMessagingOptions _options;
    private readonly ILogger<FirebaseCloudMessagingSender> _logger;

    public FirebaseCloudMessagingSender(
        HttpClient httpClient,
        IFirebaseAccessTokenProvider tokenProvider,
        IStaffDeviceRegistry devices,
        IOptions<FirebaseMessagingOptions> options,
        ILogger<FirebaseCloudMessagingSender> logger)
    {
        _httpClient = httpClient;
        _tokenProvider = tokenProvider;
        _devices = devices;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<NotificationSendResult> SendAsync(
        NotificationOutboxMessage message,
        CancellationToken cancellationToken)
    {
        if (!_options.IsConfigured)
        {
            // Reported as a failure rather than a success so it is visible in the
            // notification history, but it is a configuration state rather than a fault
            // and says so.
            return NotificationSendResult.Failure(
                "Push notifications are not configured yet, so this was not sent.");
        }

        string accessToken;
        try
        {
            accessToken = await _tokenProvider.GetAccessTokenAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Could not obtain a Firebase access token.");
            return NotificationSendResult.Failure(
                "Could not authenticate with Firebase. Check the service account key.");
        }

        var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"https://fcm.googleapis.com/v1/projects/{_options.ProjectId}/messages:send")
        {
            Content = JsonContent.Create(BuildPayload(message)),
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            // Worth retrying: the outbox will pick it up again.
            return NotificationSendResult.Failure($"Firebase was unreachable: {exception.Message}");
        }

        if (response.IsSuccessStatusCode)
            return NotificationSendResult.Success();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (IsDeviceGone(response.StatusCode, body))
        {
            // The phone has been reinstalled, cleared, or the token rotated. Retiring it
            // stops every future booking queuing a message that can never arrive.
            await _devices.RetireAsync(message.Recipient, cancellationToken);

            _logger.LogInformation(
                "Retired a device registration Firebase no longer recognises.");

            return NotificationSendResult.Failure(
                "This device is no longer registered, so it has been removed.");
        }

        _logger.LogWarning(
            "Firebase rejected a push notification with status {Status}.",
            (int)response.StatusCode);

        return NotificationSendResult.Failure(
            $"Firebase rejected the notification with status {(int)response.StatusCode}.");
    }

    /// <summary>
    /// Whether Firebase is saying this device will never accept a message again.
    /// </summary>
    /// <remarks>
    /// A 404 with UNREGISTERED is the documented signal that a token is dead. A 400 with
    /// INVALID_ARGUMENT on the token is malformed input, which will also never succeed.
    /// Everything else — including 429 and 5xx — is temporary and must be left to retry.
    /// </remarks>
    private static bool IsDeviceGone(HttpStatusCode status, string body)
    {
        if (status == HttpStatusCode.NotFound)
            return true;

        if (status != HttpStatusCode.BadRequest)
            return false;

        return body.Contains("UNREGISTERED", StringComparison.OrdinalIgnoreCase) ||
            body.Contains("INVALID_ARGUMENT", StringComparison.OrdinalIgnoreCase);
    }

    private static object BuildPayload(NotificationOutboxMessage message) => new
    {
        message = new
        {
            token = message.Recipient,
            notification = new
            {
                title = string.IsNullOrWhiteSpace(message.Subject) ? "Spinner" : message.Subject,
                body = message.Message,
            },
            // Carried so tapping the notification can open the order it refers to. The
            // code rather than only the id, because that is what the order ledger can be
            // searched by; an id alone would open the list and leave the owner to find
            // the booking themselves.
            data = new Dictionary<string, string>
            {
                ["orderId"] = message.OrderId?.ToString() ?? string.Empty,
                ["orderCode"] = message.Order?.OrderCode ?? string.Empty,
            },
            android = new
            {
                priority = "high",
                notification = new
                {
                    // Grouped per order, so several updates about one job replace each
                    // other on the lock screen instead of stacking up.
                    tag = message.OrderId?.ToString() ?? "spinner",
                    channel_id = "bookings",
                },
            },
        },
    };
}
