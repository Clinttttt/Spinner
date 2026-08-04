using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Pickups;

public sealed record PickupDetailsResponse(
    Guid OrderId,
    string OrderCode,
    string TrackingCode,
    string CustomerName,
    string MobileNumber,
    string? EmailAddress,
    string ServiceName,
    int LoadCount,
    FulfillmentType FulfillmentType,
    string Address,
    DateOnly PreferredDate,
    string PreferredTimeWindow,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    OrderStatus OrderStatus,
    PickupStatus? PickupStatus,
    string? PickupFailureReason,
    DateTimeOffset? PickupUpdatedAt,
    decimal EstimatedTotalAmount,
    string? AdditionalNotes)
{
    public static PickupDetailsResponse FromEntity(LaundryOrder order) => new(
        order.Id,
        order.OrderCode,
        order.TrackingCode,
        order.ContactName,
        order.Customer.MobileNumber,
        order.Customer.EmailAddress,
        order.ServiceName,
        order.LoadCount,
        order.FulfillmentType,
        order.Address,
        order.PreferredDate,
        order.PreferredTimeWindow,
        order.PaymentMethod,
        order.PaymentStatus,
        order.Status,
        order.PickupStatus,
        order.PickupFailureReason,
        order.PickupUpdatedAt,
        order.EstimatedTotalAmount,
        order.AdditionalNotes);
}
