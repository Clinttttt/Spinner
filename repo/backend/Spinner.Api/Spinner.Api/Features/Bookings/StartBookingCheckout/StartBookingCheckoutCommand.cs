using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Bookings.CreateBooking;

namespace Spinner.Api.Features.Bookings.StartBookingCheckout;

/// <summary>
/// Starts a paid checkout for a booking that does not exist yet.
/// </summary>
/// <remarks>
/// Carries the same command the free path uses, so the booking is validated,
/// priced, and created by exactly one piece of code whichever way it is paid for.
/// </remarks>
public sealed record StartBookingCheckoutCommand(CreateBookingCommand Booking)
    : IRequest<Result<BookingCheckoutResponse>>;

public sealed record BookingCheckoutResponse(
    string Reference,
    string CheckoutUrl,
    decimal Amount,
    string Currency);
