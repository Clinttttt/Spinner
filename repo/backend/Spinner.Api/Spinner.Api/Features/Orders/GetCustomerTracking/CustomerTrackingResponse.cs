using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Orders.GetCustomerTracking;

public sealed record CustomerTrackingResponse(
    string OrderCode,
    string TrackingCode,
    string CustomerName,
    string ServiceName,
    FulfillmentType FulfillmentType,
    DateOnly PreferredDate,
    string PreferredTimeWindow,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    OrderStatus Status,
    string CustomerFacingStatus,
    decimal EstimatedTotalAmount,
    DateTimeOffset UpdatedAt)
{
    public static CustomerTrackingResponse FromEntity(LaundryOrder order) => new(
        order.OrderCode,
        order.TrackingCode,
        order.Customer.FullName,
        order.ServiceName,
        order.FulfillmentType,
        order.PreferredDate,
        order.PreferredTimeWindow,
        order.PaymentMethod,
        order.PaymentStatus,
        order.Status,
        ToCustomerFacingStatus(order),
        order.EstimatedTotalAmount,
        order.UpdatedAt);

    private static string ToCustomerFacingStatus(LaundryOrder order)
    {
        if (order.FulfillmentType == FulfillmentType.DropOff)
        {
            return order.Status switch
            {
                OrderStatus.PickedUp => "Dropped Off",
                OrderStatus.ReadyForDelivery => "Ready for Claim",
                _ => ToTitle(order.Status)
            };
        }

        return ToTitle(order.Status);
    }

    private static string ToTitle(OrderStatus status) => status switch
    {
        OrderStatus.BookingReceived => "Booking Received",
        OrderStatus.BeingProcessed => "Being Processed",
        OrderStatus.ReadyForDelivery => "Ready for Delivery",
        _ => status.ToString()
    };
}
