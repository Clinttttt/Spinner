using Spinner.Api.Domain.Customers;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;

namespace Spinner.Test.Domain.Orders;

/// <summary>
/// The app has always offered an "on route" step, but the domain had no state for it, so
/// the change was made in the app's memory only. The rider marked a job as on the way and
/// the column emptied the next time the schedule refreshed, which is worse than not
/// offering it at all.
/// </summary>
public sealed class PickupOnRouteTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 11, 9, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Should_Record_That_The_Rider_Set_Out()
    {
        var order = ConfirmedPickup();

        Assert.True(order.MarkOnRoute(Now).IsSuccess);

        Assert.Equal(PickupStatus.OnRoute, order.PickupStatus);
        // Leaving the shop is not progress on the laundry, so the order itself stays put.
        Assert.Equal(OrderStatus.Confirmed, order.Status);
        Assert.Equal(Now, order.PickupUpdatedAt);
    }

    [Fact]
    public void Should_Still_Allow_Collection_After_Setting_Out()
    {
        // The whole point of the step: it sits between confirming and collecting, so it
        // must not get in the way of collecting.
        var order = ConfirmedPickup();
        Assert.True(order.MarkOnRoute(Now).IsSuccess);

        Assert.True(order.MarkPickedUp(Now.AddMinutes(20)).IsSuccess);
        Assert.Equal(PickupStatus.PickedUp, order.PickupStatus);
        Assert.Equal(OrderStatus.PickedUp, order.Status);
    }

    [Fact]
    public void Should_Refuse_To_Set_Out_Twice()
    {
        var order = ConfirmedPickup();
        Assert.True(order.MarkOnRoute(Now).IsSuccess);

        Assert.False(order.MarkOnRoute(Now.AddMinutes(1)).IsSuccess);
    }

    [Fact]
    public void Should_Refuse_Before_The_Booking_Is_Confirmed()
    {
        // A booking the owner has not accepted is not a job to drive out for.
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);

        Assert.False(order.MarkOnRoute(Now).IsSuccess);
        Assert.Equal(PickupStatus.Scheduled, order.PickupStatus);
    }

    [Fact]
    public void Should_Refuse_For_A_Drop_Off_Order()
    {
        var order = CreateOrder(FulfillmentType.DropOff);
        Assert.True(order.Confirm(Now).IsSuccess);

        Assert.False(order.MarkOnRoute(Now).IsSuccess);
    }

    private static LaundryOrder ConfirmedPickup()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        Assert.True(order.Confirm(Now).IsSuccess);
        return order;
    }

    /// <summary>Mirrors CreateOrder in LaundryOrderTests.</summary>
    private static LaundryOrder CreateOrder(FulfillmentType fulfillmentType)
    {
        var customer = new Customer("Maria Santos", "09171234567", null, Now);
        var service = new LaundryService(
            "Wash, Dry & Fold",
            null,
            "load",
            170m,
            supportsPickupAndDelivery: true,
            deliveryFee: 30m,
            Now);

        return new LaundryOrder(
            "ES-TEST",
            "TRK-TEST",
            customer,
            service,
            fulfillmentType,
            "Brgy. 10",
            DateOnly.FromDateTime(Now.UtcDateTime.Date),
            "6:00 AM - 8:00 AM",
            PaymentMethod.CashOnDelivery,
            loadCount: 2,
            null,
            Now);
    }
}
