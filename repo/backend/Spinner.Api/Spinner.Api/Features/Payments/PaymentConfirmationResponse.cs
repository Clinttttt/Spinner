using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Payments;

public sealed record PaymentConfirmationResponse(
    Guid OrderId,
    string OrderCode,
    string CustomerName,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    DateTimeOffset? PaidAt,
    string ReceiptCode,
    decimal TotalAmount)
{
    public static PaymentConfirmationResponse FromEntity(LaundryOrder order) => new(
        order.Id,
        order.OrderCode,
        order.Customer.FullName,
        order.PaymentMethod,
        order.PaymentStatus,
        order.PaidAt,
        order.ReceiptCode ?? string.Empty,
        order.EstimatedTotalAmount);
}
