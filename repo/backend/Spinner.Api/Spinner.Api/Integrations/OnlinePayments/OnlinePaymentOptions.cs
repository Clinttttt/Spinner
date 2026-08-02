namespace Spinner.Api.Integrations.OnlinePayments;

public sealed class OnlinePaymentOptions
{
    public const string SectionName = "OnlinePayments";

    public string PublicPaymentBaseUrl { get; set; } = "/pay";

    /// <summary>Signing secret for the legacy self-signed webhook.</summary>
    public string WebhookSecret { get; set; } = string.Empty;

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
