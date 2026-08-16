using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Integrations.OnlinePayments;

/// <summary>
/// Creates a PayMongo Checkout Session offering QRPh.
/// </summary>
/// <remarks>
/// A hosted checkout rather than a raw QRPh source: PayMongo renders and refreshes
/// the QR, handles expiry, and reports the outcome through one signed webhook
/// event, so none of that has to be reimplemented here.
///
/// Amounts are sent in centavos as integers. Money is never taken from the client
/// request; it is recomputed from the shop's own price list before it gets here.
/// </remarks>
public sealed class PayMongoCheckoutGateway : IPaymentCheckoutGateway
{
    private const string BaseAddress = "https://api.paymongo.com/v1/";

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    private readonly HttpClient _httpClient;
    private readonly OnlinePaymentOptions _options;
    private readonly ILogger<PayMongoCheckoutGateway> _logger;

    public PayMongoCheckoutGateway(
        HttpClient httpClient,
        IOptions<OnlinePaymentOptions> options,
        ILogger<PayMongoCheckoutGateway> logger)
    {
        _options = options.Value;
        _logger = logger;
        _httpClient = httpClient;

        if (_httpClient.BaseAddress is null)
            _httpClient.BaseAddress = new Uri(BaseAddress);

        if (!string.IsNullOrWhiteSpace(_options.PayMongoSecretKey))
        {
            // PayMongo uses HTTP Basic with the secret key as the username.
            var credentials = Convert.ToBase64String(
                Encoding.ASCII.GetBytes($"{_options.PayMongoSecretKey}:"));
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Basic", credentials);
        }
    }

    public bool IsConfigured => _options.IsPayMongoConfigured;

    public async Task<Result<CheckoutSessionResult>> CreateSessionAsync(
        CheckoutSessionRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured)
            return Result<CheckoutSessionResult>.Conflict("Online payment is not configured.");

        var payload = new
        {
            data = new
            {
                attributes = new
                {
                    billing = new
                    {
                        email = string.IsNullOrWhiteSpace(request.EmailAddress) ? null : request.EmailAddress,
                        name = request.CustomerName,
                        phone = request.MobileNumber,
                    },
                    cancel_url = request.CancelUrl,
                    description = request.Description,
                    line_items = request.Items.Select(item => new
                    {
                        amount = ToCentavos(item.UnitAmount),
                        currency = "PHP",
                        description = item.Description,
                        // Omitted entirely rather than sent empty: PayMongo draws a large grey
                        // tile with the line's first letter when there is no image, and an empty
                        // array is treated the same way as none.
                        images = LineItemImages(request.LineItemImageUrl),
                        name = item.Name,
                        quantity = item.Quantity,
                    }).ToArray(),
                    payment_method_types = new[] { "qrph" },
                    reference_number = request.Reference,
                    send_email_receipt = false,
                    show_description = true,
                    show_line_items = true,
                    statement_descriptor = StatementDescriptor(request.StatementDescriptor),
                    success_url = request.SuccessUrl,
                },
            },
        };

        using var content = new StringContent(
            JsonSerializer.Serialize(payload, SerializerOptions), Encoding.UTF8, "application/json");

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsync("checkout_sessions", content, cancellationToken);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            _logger.LogError(exception, "PayMongo checkout session request failed to send.");
            return Result<CheckoutSessionResult>.Conflict(
                "The payment service could not be reached. Please try again in a moment.");
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            // The body carries the provider's own explanation, which is what makes
            // a misconfigured key or a rejected amount diagnosable.
            _logger.LogError(
                "PayMongo rejected the checkout session. Status {Status}. Body {Body}",
                (int)response.StatusCode,
                body);

            return Result<CheckoutSessionResult>.Conflict(
                "The payment service rejected this checkout. Please try again or choose Cash on Delivery.");
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            var data = document.RootElement.GetProperty("data");
            var sessionId = data.GetProperty("id").GetString();
            var checkoutUrl = data.GetProperty("attributes").GetProperty("checkout_url").GetString();

            if (string.IsNullOrWhiteSpace(sessionId) || string.IsNullOrWhiteSpace(checkoutUrl))
                return Result<CheckoutSessionResult>.Conflict("The payment service returned an unusable checkout.");

            return Result<CheckoutSessionResult>.Success(new CheckoutSessionResult(sessionId, checkoutUrl));
        }
        catch (Exception exception) when (exception is JsonException or KeyNotFoundException)
        {
            _logger.LogError(exception, "PayMongo checkout session response could not be read. Body {Body}", body);
            return Result<CheckoutSessionResult>.Conflict("The payment service returned an unexpected response.");
        }
    }

    /// <summary>PayMongo works in centavos, so pesos are scaled and rounded once.</summary>
    /// <summary>
    /// Longest statement descriptor sent to PayMongo.
    /// </summary>
    /// <remarks>
    /// Truncated rather than sent long, because a rejected checkout would stop the customer
    /// paying at all — a slightly clipped shop name is a far better outcome than that.
    /// </remarks>
    private const int StatementDescriptorLimit = 30;

    internal static string? StatementDescriptor(string? value)
    {
        var descriptor = value?.Trim();

        if (string.IsNullOrWhiteSpace(descriptor))
            return null;

        return descriptor.Length <= StatementDescriptorLimit
            ? descriptor
            : descriptor[..StatementDescriptorLimit].TrimEnd();
    }

    /// <summary>
    /// The image list for a checkout line, or null so the field is omitted.
    /// </summary>
    /// <remarks>
    /// Only an absolute HTTPS address is offered. PayMongo's page fetches this itself, so a
    /// relative path or a local address would render as a broken image on the customer's
    /// screen — worse than the placeholder it replaces.
    /// </remarks>
    internal static string[]? LineItemImages(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return null;

        return Uri.TryCreate(imageUrl.Trim(), UriKind.Absolute, out var uri) &&
               string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            ? [uri.ToString()]
            : null;
    }

    internal static int ToCentavos(decimal pesos) =>
        (int)decimal.Round(pesos * 100m, 0, MidpointRounding.AwayFromZero);
}
