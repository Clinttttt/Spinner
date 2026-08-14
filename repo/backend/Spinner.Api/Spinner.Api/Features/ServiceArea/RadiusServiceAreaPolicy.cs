using Spinner.Api.Common.Geo;

namespace Spinner.Api.Features.ServiceArea;

/// <summary>
/// Serves every point within a fixed straight-line distance of the shop.
/// </summary>
public sealed class RadiusServiceAreaPolicy : IServiceAreaPolicy
{
    private readonly GeoPoint _origin;
    private readonly double _radiusKm;
    private readonly string _businessName;

    /// <param name="businessName">
    /// The shop's own name, used only in the message a customer reads when their pin falls
    /// outside the area. It used to be written into that sentence, which made a message the
    /// public sees belong to one particular laundromat. Empty is allowed and reads as "the
    /// shop", so a deployment that has not set a name still says something sensible.
    /// </param>
    public RadiusServiceAreaPolicy(GeoPoint origin, decimal radiusKm, string businessName = "")
    {
        if (!origin.IsValid)
            throw new ArgumentOutOfRangeException(nameof(origin), "Origin must be a valid coordinate.");

        if (radiusKm <= 0m)
            throw new ArgumentOutOfRangeException(nameof(radiusKm), "Radius must be greater than zero.");

        _origin = origin;
        _radiusKm = (double)radiusKm;
        _businessName = businessName.Trim();
    }

    public string Name => "radius";

    public ServiceAreaDecision Evaluate(GeoPoint point)
    {
        if (!point.IsValid)
        {
            return new ServiceAreaDecision(
                ServiceAreaStatus.Outside,
                null,
                _radiusKm,
                Name,
                "That location is not a valid coordinate. Move the map pin to your pickup point.");
        }

        var distanceKm = Math.Round(GeoDistance.KilometresBetween(_origin, point), 2);

        if (distanceKm <= _radiusKm)
        {
            return new ServiceAreaDecision(
                ServiceAreaStatus.Inside,
                distanceKm,
                _radiusKm,
                Name,
                $"This location is within our pickup area, about {Format(distanceKm)} away.");
        }

        return new ServiceAreaDecision(
            ServiceAreaStatus.Outside,
            distanceKm,
            _radiusKm,
            Name,
            $"This point is about {Format(distanceKm)} away, outside our {Format(_radiusKm)} pickup area. " +
            $"Please contact {(_businessName.Length > 0 ? _businessName : "the shop")} to arrange it.");
    }

    private static string Format(double kilometres) =>
        kilometres < 1
            ? $"{Math.Round(kilometres * 1000)} m"
            : $"{kilometres.ToString("0.#", System.Globalization.CultureInfo.InvariantCulture)} km";
}
