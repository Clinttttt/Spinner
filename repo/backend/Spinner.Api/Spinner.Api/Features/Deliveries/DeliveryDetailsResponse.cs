using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Deliveries;

public sealed record DeliveryDetailsResponse(
    Guid OrderId,
    string OrderCode,
    string TrackingCode,
    string CustomerName,
    string MobileNumber,
    string? EmailAddress,
    string ServiceName,
    int LoadCount,
    string Address,
    DateOnly PreferredDate,
    string PreferredTimeWindow,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    OrderStatus OrderStatus,
    DeliveryStatus? DeliveryStatus,
    string? DeliveryFailureReason,
    DateTimeOffset? DeliveryUpdatedAt,
    decimal EstimatedTotalAmount,
    decimal AmountToCollect,
    string? AdditionalNotes)
{
    public static DeliveryDetailsResponse FromEntity(LaundryOrder order) => new(
        order.Id,
        order.OrderCode,
        order.TrackingCode,
        order.Customer.FullName,
        order.Customer.MobileNumber,
        order.Customer.EmailAddress,
        order.ServiceName,
        order.LoadCount,
        order.Address,
        order.PreferredDate,
        order.PreferredTimeWindow,
        order.PaymentMethod,
        order.PaymentStatus,
        order.Status,
        order.DeliveryStatus,
        order.DeliveryFailureReason,
        order.DeliveryUpdatedAt,
        order.EstimatedTotalAmount,
        order.PaymentStatus == PaymentStatus.Paid ? 0m : order.EstimatedTotalAmount,
        order.AdditionalNotes);
}
