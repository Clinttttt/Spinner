using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Receipts;

public sealed record ReceiptResponse(
    string ReceiptTitle,
    string ReceiptCode,
    string OrderCode,
    string CustomerName,
    string ServiceName,
    int LoadCount,
    string UnitLabel,
    decimal ServiceAmount,
    decimal DeliveryFee,
    decimal TotalAmount,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    DateTimeOffset? PaidAt)
{
    public static ReceiptResponse FromEntity(LaundryOrder order) => new(
        "Digital Receipt",
        order.ReceiptCode ?? string.Empty,
        order.OrderCode,
        order.ContactName,
        order.ServiceName,
        order.LoadCount,
        order.UnitLabel,
        order.EstimatedServiceAmount,
        order.EstimatedDeliveryFee,
        order.EstimatedTotalAmount,
        order.PaymentMethod,
        order.PaymentStatus,
        order.PaidAt);
}
