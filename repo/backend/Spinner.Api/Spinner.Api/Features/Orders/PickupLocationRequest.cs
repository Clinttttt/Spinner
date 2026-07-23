using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Orders;

public sealed record PickupLocationRequest(
    string FormattedAddress,
    decimal Latitude,
    decimal Longitude,
    string? PlaceId,
    string? PlusCode,
    string? Barangay,
    string? CityOrMunicipality,
    string? Landmark,
    string? PickupInstructions,
    string LocationSource,
    bool LocationConfirmed,
    DateTimeOffset? ConfirmedAt)
{
    public PickupLocationSnapshot ToSnapshot() => new(
        FormattedAddress,
        Latitude,
        Longitude,
        PlaceId,
        PlusCode,
        Barangay,
        CityOrMunicipality,
        Landmark,
        PickupInstructions,
        LocationSource,
        LocationConfirmed,
        ConfirmedAt);
}
