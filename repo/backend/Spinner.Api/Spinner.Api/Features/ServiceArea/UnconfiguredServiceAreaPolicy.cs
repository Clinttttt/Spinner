using Spinner.Api.Common.Geo;

namespace Spinner.Api.Features.ServiceArea;

/// <summary>
/// Used when no pickup area has been configured.
/// </summary>
/// <remarks>
/// Permissive by design. An unset shop coordinate is an administrative gap, not
/// a customer's mistake, and must never block bookings.
/// </remarks>
public sealed class UnconfiguredServiceAreaPolicy : IServiceAreaPolicy
{
    public static readonly UnconfiguredServiceAreaPolicy Instance = new();

    public string Name => "unconfigured";

    public ServiceAreaDecision Evaluate(GeoPoint point) => new(
        ServiceAreaStatus.NotConfigured,
        null,
        null,
        Name,
        "Pickup area checking is not set up yet. Your booking will be reviewed by staff.");
}
