namespace Spinner.Api.Domain.Orders;

/// <summary>
/// What a booking will cost, before the order is created.
/// </summary>
public sealed record BookingQuote(
    int LoadCount,
    decimal ServiceAmount,
    decimal DeliveryFee,
    decimal TotalAmount);
