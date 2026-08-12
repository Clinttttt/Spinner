namespace Spinner.Api.Integrations.OnlinePayments;

public sealed class OnlinePaymentOptions
{
    public const string SectionName = "OnlinePayments";

    public string PublicPaymentBaseUrl { get; set; } = "/pay";

    /// <summary>Signing secret for the legacy self-signed webhook.</summary>
    public string WebhookSecret { get; set; } = string.Empty;

    /// <summary>
    /// Whether the legacy self-signed webhook may still settle a payment. Off by default.
    /// </summary>
    /// <remarks>
    /// PayMongo is the gateway, and it posts to the paymongo/webhook route with its own
    /// signature header; it cannot reach this one, whose body and signature are a different
    /// shape entirely. That left a second route able to mark any QR order paid, guarded only
    /// by a long-lived shared secret sitting in configuration — a spare key to the till.
    ///
    /// Closed rather than deleted, and it logs when something knocks, so a caller nobody
    /// remembers shows up as a warning instead of as payments that quietly stop being
    /// recorded. Set this to true to reopen it if such a caller turns out to exist.
    /// </remarks>
    public bool EnableLegacyWebhook { get; set; }

    /// <summary>PayMongo secret key. Empty means online payment is not configured.</summary>
    public string PayMongoSecretKey { get; set; } = string.Empty;

    /// <summary>Signing secret shown once when the PayMongo webhook is created.</summary>
    public string PayMongoWebhookSecret { get; set; } = string.Empty;

    /// <summary>
    /// Where the customer lands after paying. The reference is appended, and the
    /// page reads the real status from the API rather than trusting the redirect.
    /// </summary>
    public string CheckoutSuccessUrl { get; set; } = string.Empty;

    /// <summary>Where the customer lands if they abandon the checkout.</summary>
    public string CheckoutCancelUrl { get; set; } = string.Empty;

    /// <summary>How long an unpaid checkout stays claimable.</summary>
    public int CheckoutMinutesToLive { get; set; } = 60;

    /// <summary>
    /// True when the keys are PayMongo test keys. Decides which signature the
    /// webhook verifies, because PayMongo signs test and live traffic separately.
    /// </summary>
    public bool IsTestMode => PayMongoSecretKey.StartsWith("sk_test_", StringComparison.Ordinal);

    public bool IsPayMongoConfigured =>
        !string.IsNullOrWhiteSpace(PayMongoSecretKey) &&
        !string.IsNullOrWhiteSpace(PayMongoWebhookSecret);
}
