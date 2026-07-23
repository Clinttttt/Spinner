using Spinner.Api.Domain.Services;

namespace Spinner.Test.Domain.Services;

public sealed class LaundryServiceTests
{
    [Fact]
    public void Disable_Should_Mark_Service_Inactive()
    {
        var service = CreateService();

        var result = service.Disable(DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.False(service.IsActive);
    }

    [Fact]
    public void Disable_Should_Fail_When_Service_Is_Already_Disabled()
    {
        var service = CreateService();
        service.Disable(DateTimeOffset.UtcNow);

        var result = service.Disable(DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public void UpdatePricing_Should_Fail_When_Service_Is_Disabled()
    {
        var service = CreateService();
        service.Disable(DateTimeOffset.UtcNow);

        var result = service.UpdatePricing("load", 200m, 30m, DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.Equal(170m, service.BasePrice);
    }

    [Fact]
    public void SetAvailability_Should_Allow_Reenabling_A_Disabled_Service()
    {
        var service = CreateService();
        service.Disable(DateTimeOffset.UtcNow);

        var result = service.SetAvailability(true, DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.True(service.IsActive);
    }

    private static LaundryService CreateService() => new(
        "Wash, Dry & Fold",
        "Standard laundry service",
        "load",
        170m,
        supportsPickupAndDelivery: true,
        deliveryFee: 30m,
        DateTimeOffset.UtcNow);
}
