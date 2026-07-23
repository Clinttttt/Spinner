namespace Spinner.Api.Features.Payments.HandleOnlinePaymentWebhook;

public sealed record OnlinePaymentWebhookRequest(
    string PaymentReference,
    decimal Amount,
    string Status,
    string Signature);
