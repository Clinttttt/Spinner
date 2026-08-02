using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Bookings.GetBookingCheckoutStatus;

public sealed record GetBookingCheckoutStatusQuery(string Reference)
    : IRequest<Result<BookingCheckoutStatusResponse>>;

public sealed record CheckoutServiceLineResponse(string Name, int Quantity, string UnitLabel, decimal Subtotal);

/// <summary>
/// What the payment-complete page shows.
/// </summary>
/// <remarks>
/// Deliberately not a plain "success", because the customer arrives here from a
/// provider redirect that proves nothing. <see cref="State"/> is the API's own
/// judgement: awaitingPayment, paid, failed, or expired.
/// </remarks>
public sealed record BookingCheckoutStatusResponse(
    string Reference,
    string State,
    decimal Amount,
    string Currency,
    string? CheckoutUrl,
    string? OrderCode,
    string? TrackingCode,
    FulfillmentType? FulfillmentType,
    string CustomerName,
    string? Address,
    string? Landmark,
    DateOnly? PreferredDate,
    string? PreferredTimeWindow,
    string? MobileNumber,
    IReadOnlyList<CheckoutServiceLineResponse> Services,
    decimal ServiceAmount,
    decimal DeliveryFee,
    string? BusinessName,
    string? BusinessAddress);
