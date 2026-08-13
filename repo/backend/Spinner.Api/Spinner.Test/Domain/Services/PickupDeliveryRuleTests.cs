using Spinner.Api.Domain.Services;

namespace Spinner.Test.Domain.Services;

public sealed class PickupDeliveryRuleTests
{
    [Fact]
    public void UndeliverableNames_Should_List_Only_The_Services_That_Cannot_Be_Collected()
    {
        var services = new[]
        {
            Service("Wash, Dry & Fold", supportsPickupAndDelivery: true),
            Service("Self-Service", supportsPickupAndDelivery: false),
            Service("Hand Wash", supportsPickupAndDelivery: false),
        };

        var names = PickupDeliveryRule.UndeliverableNames(services);

        Assert.Equal(["Self-Service", "Hand Wash"], names);
    }

    [Fact]
    public void UndeliverableNames_Should_Be_Empty_When_Everything_Can_Be_Collected()
    {
        var services = new[] { Service("Dry Only", supportsPickupAndDelivery: true) };

        Assert.Empty(PickupDeliveryRule.UndeliverableNames(services));
    }

    [Fact]
    public void Describe_Should_Name_A_Single_Service_And_Offer_The_Alternative()
    {
        var message = PickupDeliveryRule.Describe(["Self-Service"]);

        Assert.Contains("Self-Service", message);
        // The reader needs to know what to do next, not only that they are wrong.
        Assert.Contains("drop-off", message);
        Assert.DoesNotContain("them", message);
    }

    [Fact]
    public void Describe_Should_Name_Every_Offending_Service()
    {
        var message = PickupDeliveryRule.Describe(["Self-Service", "Hand Wash"]);

        Assert.Contains("Self-Service", message);
        Assert.Contains("Hand Wash", message);
        Assert.Contains("Remove them", message);
    }

    private static LaundryService Service(string name, bool supportsPickupAndDelivery) =>
        new(
            name,
            null,
            "per load",
            100m,
            supportsPickupAndDelivery,
            deliveryFee: supportsPickupAndDelivery ? 60m : null,
            DateTimeOffset.UtcNow);
}
