using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.Bookings.ConfirmBooking;

public sealed record ConfirmBookingCommand(Guid BookingId) : IRequest<Result<OrderDetailsResponse>>;
