using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Geo;
using Spinner.Api.Features.BusinessSettings;
using Spinner.Api.Features.BusinessSettings.UpdatePickupServiceArea;
using Spinner.Api.Features.ServiceArea;
using Spinner.Api.Features.ServiceArea.CheckServiceArea;
using Spinner.Test.TestHelpers;
using DomainBusinessSettings = Spinner.Api.Domain.Business.BusinessSettings;

namespace Spinner.Test.Features.ServiceArea;

public sealed class ServiceAreaPolicyProviderTests
{
    private static readonly GeoPoint Shop = new(9.2381784m, 125.9624521m);

    [Fact]
    public async Task Should_Start_Unconfigured_Until_Shop_Coordinates_Are_Set()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var policy = await new BusinessSettingsServiceAreaPolicyProvider(dbContext)
            .GetAsync(CancellationToken.None);

        Assert.Equal("unconfigured", policy.Name);
        Assert.True(policy.Evaluate(Shop).AllowsBooking);
    }

    [Fact]
    public async Task New_Settings_Should_Seed_The_Default_Radius()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(dbContext, CancellationToken.None);

        Assert.Equal(DomainBusinessSettings.DefaultPickupServiceRadiusKm, settings.PickupServiceRadiusKm);
        Assert.Equal(15m, settings.PickupServiceRadiusKm);
        // Seeded but not yet enforceable: the shop's own coordinates are unknown.
        Assert.False(settings.HasPickupServiceArea);
    }

    [Fact]
    public async Task Should_Use_The_Radius_Stored_In_Business_Settings()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await new UpdatePickupServiceAreaHandler(dbContext).Handle(
            new UpdatePickupServiceAreaCommand(Shop.Latitude, Shop.Longitude, 4m),
            CancellationToken.None);

        var policy = await new BusinessSettingsServiceAreaPolicyProvider(dbContext)
            .GetAsync(CancellationToken.None);

        Assert.Equal("radius", policy.Name);
        // ~3 km away: inside the default 15 km, outside the stored 4 km... just.
        var nearby = new GeoPoint(9.2651784m, 125.9624521m);
        Assert.Equal(ServiceAreaStatus.Inside, policy.Evaluate(nearby).Status);
        Assert.Equal(4, policy.Evaluate(nearby).MaxRadiusKm);

        // 8 km away is beyond the stored radius.
        var further = new GeoPoint(9.3101784m, 125.9624521m);
        Assert.Equal(ServiceAreaStatus.Outside, policy.Evaluate(further).Status);
    }

    [Fact]
    public async Task Clearing_The_Coordinates_Should_Disable_Enforcement()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var handler = new UpdatePickupServiceAreaHandler(dbContext);
        await handler.Handle(
            new UpdatePickupServiceAreaCommand(Shop.Latitude, Shop.Longitude, 15m),
            CancellationToken.None);

        await handler.Handle(
            new UpdatePickupServiceAreaCommand(null, null, 15m),
            CancellationToken.None);

        var policy = await new BusinessSettingsServiceAreaPolicyProvider(dbContext)
            .GetAsync(CancellationToken.None);
        Assert.Equal("unconfigured", policy.Name);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(501)]
    public async Task Should_Reject_An_Unusable_Radius(int radiusKm)
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await new UpdatePickupServiceAreaHandler(dbContext).Handle(
            new UpdatePickupServiceAreaCommand(Shop.Latitude, Shop.Longitude, radiusKm),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Should_Reject_A_Half_Specified_Origin()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await new UpdatePickupServiceAreaHandler(dbContext).Handle(
            new UpdatePickupServiceAreaCommand(Shop.Latitude, null, 15m),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("latitude and a longitude", result.Error.Message);
    }

    [Fact]
    public async Task Check_Endpoint_Should_Report_Inside_And_Outside()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await new UpdatePickupServiceAreaHandler(dbContext).Handle(
            new UpdatePickupServiceAreaCommand(Shop.Latitude, Shop.Longitude, 15m),
            CancellationToken.None);

        var handler = new CheckServiceAreaHandler(
            new BusinessSettingsServiceAreaPolicyProvider(dbContext));

        var inside = await handler.Handle(
            new CheckServiceAreaQuery(Shop.Latitude, Shop.Longitude),
            CancellationToken.None);
        Assert.Equal("inside", inside.Value!.Status);
        Assert.True(inside.Value.AllowsBooking);

        var outside = await handler.Handle(
            new CheckServiceAreaQuery(8.9475m, 125.5406m),
            CancellationToken.None);
        Assert.Equal("outside", outside.Value!.Status);
        Assert.False(outside.Value.AllowsBooking);
        Assert.Equal(15, outside.Value.MaxRadiusKm);
    }

    [Fact]
    public async Task Check_Endpoint_Should_Reject_An_Out_Of_Range_Coordinate()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await new CheckServiceAreaHandler(
                new BusinessSettingsServiceAreaPolicyProvider(dbContext))
            .Handle(new CheckServiceAreaQuery(200m, 0m), CancellationToken.None);

        Assert.False(result.IsSuccess);
    }
}
