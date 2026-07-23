using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Bookings.GetBookings;

public sealed record BookingListItemResponse(
    Guid OrderId,
    string OrderCode,
    string CustomerName,
    string MobileNumber,
    string Address,
    DateOnly PreferredDate,
    string PreferredTimeWindow,
    FulfillmentType FulfillmentType,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    OrderStatus Status,
    IReadOnlyList<string> Services,
    decimal TotalAmount,
    DateTimeOffset CreatedAt);
