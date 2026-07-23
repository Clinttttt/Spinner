namespace Spinner.Api.Integrations.OnlinePayments;

public sealed class OnlinePaymentOptions
{
    public const string SectionName = "OnlinePayments";

    public string PublicPaymentBaseUrl { get; set; } = "/pay";
    public string WebhookSecret { get; set; } = "dev-online-payment-webhook-secret";
}
