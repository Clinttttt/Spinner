using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Payments;

public sealed record OrderTotalResponse(
    Guid OrderId,
    string OrderCode,
    string CustomerName,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    decimal ServiceAmount,
    decimal DeliveryFee,
    decimal TotalAmount,
    decimal AmountToCollect)
{
    public static OrderTotalResponse FromEntity(LaundryOrder order) => new(
        order.Id,
        order.OrderCode,
        order.Customer.FullName,
        order.PaymentMethod,
        order.PaymentStatus,
        order.EstimatedServiceAmount,
        order.EstimatedDeliveryFee,
        order.EstimatedTotalAmount,
        order.PaymentStatus == PaymentStatus.Paid ? 0m : order.EstimatedTotalAmount);
}
