namespace Spinner.Api.Features.Pickups.ReschedulePickup;

public sealed record ReschedulePickupRequest(
    DateOnly PreferredDate,
    string PreferredTimeWindow);
