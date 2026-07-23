using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.Bookings.RejectBooking;

public sealed record RejectBookingCommand(Guid BookingId) : IRequest<Result<OrderDetailsResponse>>;
