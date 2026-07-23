using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.Bookings.CreateBooking;

public sealed record CreateBookingCommand(
    string FullName,
    string MobileNumber,
    string? EmailAddress,
    Guid ServiceId,
    FulfillmentType FulfillmentType,
    string Address,
    DateOnly PreferredDate,
    string PreferredTimeWindow,
    PaymentMethod PaymentMethod,
    int LoadCount,
    string? AdditionalNotes,
    PickupLocationRequest? PickupLocation = null) : IRequest<Result<BookingConfirmationResponse>>;
