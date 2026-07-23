namespace Spinner.Api.Features.Bookings.RescheduleBooking;

public sealed record RescheduleBookingRequest(
    DateOnly PreferredDate,
    string PreferredTimeWindow);
