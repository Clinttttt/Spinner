namespace Spinner.Api.Features.ServiceArea;

public enum ServiceAreaStatus
{
    /// <summary>The point is served.</summary>
    Inside = 0,

    /// <summary>The point is outside the configured area.</summary>
    Outside = 1,

    /// <summary>
    /// No area has been configured yet, so nothing can be judged. Treated as
    /// permissive: a missing setting must never stop customers from booking.
    /// </summary>
    NotConfigured = 2,
}

/// <summary>
/// The outcome of evaluating one coordinate against the active service area.
/// </summary>
/// <param name="Status">Whether the point is served.</param>
/// <param name="DistanceKm">Distance from the shop, when the policy measures one.</param>
/// <param name="MaxRadiusKm">The limit applied, when the policy has one.</param>
/// <param name="PolicyName">Which policy decided, for diagnostics.</param>
/// <param name="Message">Customer-facing explanation.</param>
public sealed record ServiceAreaDecision(
    ServiceAreaStatus Status,
    double? DistanceKm,
    double? MaxRadiusKm,
    string PolicyName,
    string Message)
{
    /// <summary>True when a booking may proceed.</summary>
    public bool AllowsBooking => Status is ServiceAreaStatus.Inside or ServiceAreaStatus.NotConfigured;
}
