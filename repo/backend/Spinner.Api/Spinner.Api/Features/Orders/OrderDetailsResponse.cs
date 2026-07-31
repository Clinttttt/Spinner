using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Orders;

public sealed record OrderDetailsResponse(
    Guid OrderId,
    string OrderCode,
    string TrackingCode,
    OrderSource Source,
    Guid CustomerId,
    string CustomerName,
    string MobileNumber,
    string? EmailAddress,
    Guid ServiceId,
    string ServiceName,
    string UnitLabel,
    int LoadCount,
    IReadOnlyList<OrderServiceItemResponse> Services,
    FulfillmentType FulfillmentType,
    string Address,
    DateOnly PreferredDate,
    string PreferredTimeWindow,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    DateTimeOffset? PaidAt,
    string? ReceiptCode,
    string? OnlinePaymentReference,
    string? OnlinePaymentCheckoutUrl,
    OrderStatus Status,
    PickupStatus? PickupStatus,
    string? PickupFailureReason,
    DateTimeOffset? PickupUpdatedAt,
    DeliveryStatus? DeliveryStatus,
    string? DeliveryFailureReason,
    DateTimeOffset? DeliveryUpdatedAt,
    decimal EstimatedServiceAmount,
    decimal EstimatedDeliveryFee,
    decimal EstimatedTotalAmount,
    decimal AdditionalCharge,
    string? AdditionalChargeReason,
    decimal Discount,
    string? DiscountReason,
    string? AdditionalNotes,
    string? SpecialInstructions,
    PreferredNotificationChannel PreferredNotificationChannel,
    PickupLocationResponse? PickupLocation,
    DateTimeOffset? ArchivedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public static OrderDetailsResponse FromEntity(LaundryOrder order) => new(
        order.Id,
        order.OrderCode,
        order.TrackingCode,
        order.Source,
        order.CustomerId,
        order.Customer.FullName,
        order.Customer.MobileNumber,
        order.Customer.EmailAddress,
        order.ServiceId,
        order.ServiceName,
        order.UnitLabel,
        order.LoadCount,
        order.ServiceItems.Count > 0
            ? order.ServiceItems.Select(OrderServiceItemResponse.FromEntity).ToList()
            : [new OrderServiceItemResponse(
                order.ServiceId,
                order.ServiceName,
                order.UnitLabel,
                order.EstimatedServiceAmount / Math.Max(1, order.LoadCount),
                order.LoadCount,
                order.EstimatedServiceAmount)],
        order.FulfillmentType,
        order.Address,
        order.PreferredDate,
        order.PreferredTimeWindow,
        order.PaymentMethod,
        order.PaymentStatus,
        order.PaidAt,
        order.ReceiptCode,
        order.OnlinePaymentReference,
        order.OnlinePaymentCheckoutUrl,
        order.Status,
        order.PickupStatus,
        order.PickupFailureReason,
        order.PickupUpdatedAt,
        order.DeliveryStatus,
        order.DeliveryFailureReason,
        order.DeliveryUpdatedAt,
        order.EstimatedServiceAmount,
        order.EstimatedDeliveryFee,
        order.EstimatedTotalAmount,
        order.AdditionalCharge,
        order.AdditionalChargeReason,
        order.Discount,
        order.DiscountReason,
        order.AdditionalNotes,
        order.SpecialInstructions,
        order.PreferredNotificationChannel,
        PickupLocationResponse.FromEntity(order.PickupLocation),
        order.ArchivedAt,
        order.CreatedAt,
        order.UpdatedAt);
}

public sealed record OrderServiceItemResponse(
    Guid ServiceId,
    string Name,
    string UnitLabel,
    decimal UnitPrice,
    int Quantity,
    decimal Subtotal)
{
    public static OrderServiceItemResponse FromEntity(OrderServiceItem item) => new(
        item.ServiceId,
        item.ServiceName,
        item.UnitLabel,
        item.UnitPrice,
        item.Quantity,
        item.Subtotal);
}

public sealed record PickupLocationResponse(
    string FormattedAddress,
    decimal Latitude,
    decimal Longitude,
    string? PlaceId,
    string? PlusCode,
    string? Barangay,
    string? CityOrMunicipality,
    string? Landmark,
    string? PickupInstructions,
    string LocationSource,
    bool LocationConfirmed,
    DateTimeOffset? ConfirmedAt)
{
    public static PickupLocationResponse? FromEntity(PickupLocationSnapshot? location) =>
        location is null
            ? null
            : new PickupLocationResponse(
                location.FormattedAddress,
                location.Latitude,
                location.Longitude,
                location.PlaceId,
                location.PlusCode,
                location.Barangay,
                location.CityOrMunicipality,
                location.Landmark,
                location.PickupInstructions,
                location.LocationSource,
                location.LocationConfirmed,
                location.ConfirmedAt);
}
