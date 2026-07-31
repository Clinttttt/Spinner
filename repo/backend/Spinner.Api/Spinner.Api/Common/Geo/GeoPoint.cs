namespace Spinner.Api.Common.Geo;

/// <summary>
/// A WGS-84 coordinate. Decimal matches how coordinates are persisted, so a
/// value survives a round trip through the database without drifting.
/// </summary>
public readonly record struct GeoPoint(decimal Latitude, decimal Longitude)
{
    public bool IsValid =>
        Latitude is >= -90m and <= 90m &&
        Longitude is >= -180m and <= 180m;
}
