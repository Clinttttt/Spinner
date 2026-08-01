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
    PickupLocationRequest? PickupLocation = null,
    IReadOnlyList<BookingServiceRequest>? Services = null)
    : IRequest<Result<BookingConfirmationResponse>>
{
    /// <summary>
    /// The chosen services, normalised. Falls back to the single
    /// <see cref="ServiceId"/> and <see cref="LoadCount"/> when no list is sent.
    /// </summary>
    public IReadOnlyList<BookingServiceRequest> ServiceSelections =>
        Services is { Count: > 0 }
            ? Services
            : [new BookingServiceRequest(ServiceId, LoadCount)];
}
