namespace Spinner.Api.Common.Geo;

public static class GeoDistance
{
    private const double EarthRadiusKm = 6371.0088;

    /// <summary>
    /// Great-circle distance in kilometres.
    /// </summary>
    /// <remarks>
    /// Haversine is accurate to a fraction of a percent at the distances a
    /// laundromat delivers over, and needs no geospatial database extension.
    /// </remarks>
    public static double KilometresBetween(GeoPoint from, GeoPoint to)
    {
        var fromLatitude = ToRadians((double)from.Latitude);
        var toLatitude = ToRadians((double)to.Latitude);
        var latitudeDelta = toLatitude - fromLatitude;
        var longitudeDelta = ToRadians((double)(to.Longitude - from.Longitude));

        var a =
            Math.Pow(Math.Sin(latitudeDelta / 2), 2) +
            (Math.Cos(fromLatitude) * Math.Cos(toLatitude) *
             Math.Pow(Math.Sin(longitudeDelta / 2), 2));

        return 2 * EarthRadiusKm * Math.Asin(Math.Min(1, Math.Sqrt(a)));
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
