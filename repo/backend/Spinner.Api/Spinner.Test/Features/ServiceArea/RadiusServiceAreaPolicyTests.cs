using Spinner.Api.Common.Geo;
using Spinner.Api.Features.ServiceArea;

namespace Spinner.Test.Features.ServiceArea;

public sealed class RadiusServiceAreaPolicyTests
{
    /// <summary>San Vicente, Madrid, Surigao del Sur.</summary>
    private static readonly GeoPoint Shop = new(9.2381784m, 125.9624521m);

    [Fact]
    public void Should_Accept_The_Shop_Itself()
    {
        var decision = new RadiusServiceAreaPolicy(Shop, 15m).Evaluate(Shop);

        Assert.Equal(ServiceAreaStatus.Inside, decision.Status);
        Assert.True(decision.AllowsBooking);
        Assert.Equal(0, decision.DistanceKm);
        Assert.Equal(15, decision.MaxRadiusKm);
    }

    [Fact]
    public void Should_Accept_A_Point_Inside_The_Radius()
    {
        // Roughly 3 km north of the shop.
        var nearby = new GeoPoint(9.2651784m, 125.9624521m);

        var decision = new RadiusServiceAreaPolicy(Shop, 15m).Evaluate(nearby);

        Assert.Equal(ServiceAreaStatus.Inside, decision.Status);
        Assert.True(decision.DistanceKm < 15);
        Assert.Contains("within our pickup area", decision.Message);
    }

    [Fact]
    public void Should_Refuse_A_Point_Beyond_The_Radius()
    {
        // Butuan City, well over 15 km away.
        var faraway = new GeoPoint(8.9475m, 125.5406m);

        var decision = new RadiusServiceAreaPolicy(Shop, 15m).Evaluate(faraway);

        Assert.Equal(ServiceAreaStatus.Outside, decision.Status);
        Assert.False(decision.AllowsBooking);
        Assert.True(decision.DistanceKm > 15);
        Assert.Contains("outside our", decision.Message);
    }

    [Fact]
    public void Should_Name_The_Shop_From_Settings_When_Refusing()
    {
        // This sentence is read by the public, so it used to put one particular laundromat's
        // name in front of every customer of every deployment.
        var faraway = new GeoPoint(8.9475m, 125.5406m);

        var decision = new RadiusServiceAreaPolicy(Shop, 15m, "Sunrise Laundry").Evaluate(faraway);

        Assert.Contains("Please contact Sunrise Laundry", decision.Message);
        Assert.DoesNotContain("Engr", decision.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Should_Still_Read_Sensibly_When_No_Shop_Name_Is_Configured()
    {
        var faraway = new GeoPoint(8.9475m, 125.5406m);

        var decision = new RadiusServiceAreaPolicy(Shop, 15m).Evaluate(faraway);

        Assert.Contains("Please contact the shop", decision.Message);
    }

    [Fact]
    public void Radius_Should_Be_Configurable_Not_Fixed_At_15km()
    {
        // ~3 km from the shop: inside a 15 km area, outside a 2 km one.
        var nearby = new GeoPoint(9.2651784m, 125.9624521m);

        Assert.Equal(
            ServiceAreaStatus.Inside,
            new RadiusServiceAreaPolicy(Shop, 15m).Evaluate(nearby).Status);
        Assert.Equal(
            ServiceAreaStatus.Outside,
            new RadiusServiceAreaPolicy(Shop, 2m).Evaluate(nearby).Status);
    }

    [Fact]
    public void Should_Refuse_An_Out_Of_Range_Coordinate()
    {
        var decision = new RadiusServiceAreaPolicy(Shop, 15m).Evaluate(new GeoPoint(120m, 500m));

        Assert.Equal(ServiceAreaStatus.Outside, decision.Status);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Should_Reject_A_Non_Positive_Radius(int radiusKm)
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => new RadiusServiceAreaPolicy(Shop, radiusKm));
    }

    [Fact]
    public void Should_Reject_An_Invalid_Origin()
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => new RadiusServiceAreaPolicy(new GeoPoint(95m, 0m), 15m));
    }

    [Fact]
    public void Unconfigured_Area_Should_Allow_Booking()
    {
        var decision = UnconfiguredServiceAreaPolicy.Instance.Evaluate(Shop);

        Assert.Equal(ServiceAreaStatus.NotConfigured, decision.Status);
        // A missing setting is an admin gap, never a reason to refuse a customer.
        Assert.True(decision.AllowsBooking);
    }
}
