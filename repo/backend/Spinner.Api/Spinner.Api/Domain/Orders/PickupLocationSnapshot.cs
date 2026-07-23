namespace Spinner.Api.Domain.Orders;

public sealed class PickupLocationSnapshot
{
    private PickupLocationSnapshot()
    {
    }

    public PickupLocationSnapshot(
        string formattedAddress,
        decimal latitude,
        decimal longitude,
        string? placeId,
        string? plusCode,
        string? barangay,
        string? cityOrMunicipality,
        string? landmark,
        string? pickupInstructions,
        string locationSource,
        bool locationConfirmed,
        DateTimeOffset? confirmedAt)
    {
        FormattedAddress = formattedAddress.Trim();
        Latitude = latitude;
        Longitude = longitude;
        PlaceId = Normalize(placeId);
        PlusCode = Normalize(plusCode);
        Barangay = Normalize(barangay);
        CityOrMunicipality = Normalize(cityOrMunicipality);
        Landmark = Normalize(landmark);
        PickupInstructions = Normalize(pickupInstructions);
        LocationSource = locationSource.Trim();
        LocationConfirmed = locationConfirmed;
        ConfirmedAt = locationConfirmed ? confirmedAt : null;
    }

    public string FormattedAddress { get; private set; } = string.Empty;
    public decimal Latitude { get; private set; }
    public decimal Longitude { get; private set; }
    public string? PlaceId { get; private set; }
    public string? PlusCode { get; private set; }
    public string? Barangay { get; private set; }
    public string? CityOrMunicipality { get; private set; }
    public string? Landmark { get; private set; }
    public string? PickupInstructions { get; private set; }
    public string LocationSource { get; private set; } = string.Empty;
    public bool LocationConfirmed { get; private set; }
    public DateTimeOffset? ConfirmedAt { get; private set; }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
