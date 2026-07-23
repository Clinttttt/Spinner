using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.Bookings.RescheduleBooking;

public sealed record RescheduleBookingCommand(
    Guid BookingId,
    DateOnly PreferredDate,
    string PreferredTimeWindow) : IRequest<Result<OrderDetailsResponse>>;
