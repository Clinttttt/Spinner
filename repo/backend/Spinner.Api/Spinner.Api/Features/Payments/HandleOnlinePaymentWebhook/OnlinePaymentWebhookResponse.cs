using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Payments.HandleOnlinePaymentWebhook;

public sealed record OnlinePaymentWebhookResponse(
    string PaymentReference,
    string OrderCode,
    PaymentStatus PaymentStatus,
    string? ReceiptCode);
