using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.Bookings.CreateBooking;

/// <summary>One chosen service and how many loads of it.</summary>
public sealed record BookingServiceRequest(Guid ServiceId, int Quantity);

public sealed record CreateBookingRequest(
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
    /// <summary>
    /// Optional multi-service selection. When present it replaces
    /// <see cref="ServiceId"/> and <see cref="LoadCount"/>, which are kept so
    /// existing single-service callers keep working unchanged.
    /// </summary>
    IReadOnlyList<BookingServiceRequest>? Services = null);
