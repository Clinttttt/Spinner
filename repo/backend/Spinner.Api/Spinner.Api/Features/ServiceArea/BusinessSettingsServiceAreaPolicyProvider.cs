using Spinner.Api.Common.Geo;
using Spinner.Api.Database;
using Spinner.Api.Features.BusinessSettings;

namespace Spinner.Api.Features.ServiceArea;

/// <summary>
/// Builds the active policy from stored business settings, so the owner can
/// change the pickup radius without a deployment.
/// </summary>
public sealed class BusinessSettingsServiceAreaPolicyProvider : IServiceAreaPolicyProvider
{
    private readonly AppDbContext _dbContext;

    public BusinessSettingsServiceAreaPolicyProvider(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IServiceAreaPolicy> GetAsync(CancellationToken cancellationToken)
    {
        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        if (!settings.HasPickupServiceArea)
            return UnconfiguredServiceAreaPolicy.Instance;

        return new RadiusServiceAreaPolicy(
            new GeoPoint(settings.PickupOriginLatitude!.Value, settings.PickupOriginLongitude!.Value),
            settings.PickupServiceRadiusKm);
    }
}
