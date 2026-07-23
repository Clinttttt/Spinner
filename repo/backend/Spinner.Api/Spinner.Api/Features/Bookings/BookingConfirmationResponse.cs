using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Bookings;

public sealed record BookingConfirmationResponse(
    Guid OrderId,
    string OrderCode,
    string TrackingCode,
    string CustomerName,
    string MobileNumber,
    string? EmailAddress,
    string ServiceName,
    string UnitLabel,
    int LoadCount,
    FulfillmentType FulfillmentType,
    string Address,
    DateOnly PreferredDate,
    string PreferredTimeWindow,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    OrderStatus Status,
    decimal EstimatedServiceAmount,
    decimal EstimatedDeliveryFee,
    decimal EstimatedTotalAmount,
    string? AdditionalNotes);
