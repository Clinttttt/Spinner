using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Payments;

public sealed record OnlinePaymentLinkResponse(
    Guid OrderId,
    string OrderCode,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    string PaymentReference,
    string CheckoutUrl,
    decimal Amount);
