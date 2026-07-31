using Spinner.Api.Common.Geo;

namespace Spinner.Api.Features.ServiceArea;

/// <summary>
/// Decides whether a coordinate is inside the pickup area.
/// </summary>
/// <remarks>
/// Deliberately an abstraction over a single method so the shape of the area can
/// change without touching booking, validation, or UI code. The current
/// implementation is a radius around the shop; a polygon boundary or a set of
/// configurable zones can be added as further implementations and selected by
/// <see cref="IServiceAreaPolicyProvider"/>.
///
/// Judgement is always made on coordinates. Matching address text is unreliable:
/// formatting varies, a nearby geocoder result may name a different barangay, and
/// informal rural addresses often omit the municipality entirely.
/// </remarks>
public interface IServiceAreaPolicy
{
    /// <summary>Identifies the policy in responses and logs.</summary>
    string Name { get; }

    ServiceAreaDecision Evaluate(GeoPoint point);
}
