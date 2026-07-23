using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Payments;

public sealed record OnlinePaymentStatusResponse(
    string PaymentReference,
    string OrderCode,
    PaymentStatus PaymentStatus,
    decimal Amount,
    DateTimeOffset? PaidAt,
    string? ReceiptCode);
