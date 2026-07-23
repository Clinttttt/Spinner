using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Bookings.GetBookingConfirmation;

public sealed record GetBookingConfirmationQuery(string OrderCode)
    : IRequest<Result<BookingConfirmationResponse>>;
