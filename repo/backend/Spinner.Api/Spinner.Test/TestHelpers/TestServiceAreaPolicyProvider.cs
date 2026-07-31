using Spinner.Api.Common.Geo;
using Spinner.Api.Features.ServiceArea;

namespace Spinner.Test.TestHelpers;

/// <summary>
/// Returns a fixed policy. Defaults to unconfigured so tests that are not about
/// the service area are unaffected by it.
/// </summary>
public sealed class TestServiceAreaPolicyProvider : IServiceAreaPolicyProvider
{
    private readonly IServiceAreaPolicy _policy;

    public TestServiceAreaPolicyProvider(IServiceAreaPolicy? policy = null)
    {
        _policy = policy ?? UnconfiguredServiceAreaPolicy.Instance;
    }

    public static TestServiceAreaPolicyProvider WithRadius(GeoPoint origin, decimal radiusKm) =>
        new(new RadiusServiceAreaPolicy(origin, radiusKm));

    public Task<IServiceAreaPolicy> GetAsync(CancellationToken cancellationToken) =>
        Task.FromResult(_policy);
}
