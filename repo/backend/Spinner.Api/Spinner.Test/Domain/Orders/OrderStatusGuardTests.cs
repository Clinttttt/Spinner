using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Customers;
using Spinner.Api.Domain.Services;

namespace Spinner.Test.Domain.Orders;

/// <summary>
/// Guards on the two ways an order can leave the normal path. Both holes below
/// were opened by later features rather than being wrong when first written, which
/// is exactly why they need tests pinning them down.
/// </summary>
public sealed class OrderStatusGuardTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 4, 9, 0, 0, TimeSpan.FromHours(8));

    private static LaundryOrder CreateOrder(
        FulfillmentType fulfillment = FulfillmentType.PickupAndDelivery)
    {
        var service = new LaundryService("Wash Dry & Fold", null, "load", 170m, true, 60m, Now);
        var selections = new[] { (Service: service, Quantity: 1) };

        return LaundryOrder.CreateCustomerBooking(
            "ES-TEST",
            "TRK-TEST",
            new Customer("Clint Villanueva", "09384326772", null, Now),
            selections,
            fulfillment,
            "Purok 4, San Vicente, Carmen",
            DateOnly.FromDateTime(Now.Date.AddDays(1)),
            "08:00-10:00",
            PaymentMethod.QrCodeOnlinePayment,
            null,
            Now);
    }

    [Fact]
    public void Should_Refuse_To_Reject_A_Booking_The_Customer_Already_Paid_For()
    {
        var order = CreateOrder();
        order.SettlePrepaidOnlinePayment("cs_test_reference", order.EstimatedTotalAmount, "QR-PAY-TEST", Now);

        // Pay-before-submit leaves a prepaid booking at Booking Received, which is
        // precisely the status rejection accepts.
        Assert.Equal(OrderStatus.BookingReceived, order.Status);
        Assert.Equal(PaymentStatus.Paid, order.PaymentStatus);

        var result = order.Reject(Now);

        Assert.False(result.IsSuccess);
        Assert.Equal(OrderStatus.BookingReceived, order.Status);
    }

    [Fact]
    public void Should_Still_Reject_An_Unpaid_Booking()
    {
        var order = CreateOrder();

        var result = order.Reject(Now);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.Rejected, order.Status);
    }

    [Fact]
    public void Should_Let_A_Drop_Off_Order_Be_Marked_As_In_The_Shop()
    {
        var order = CreateOrder(FulfillmentType.DropOff);
        Assert.True(order.Confirm(Now).IsSuccess);

        // PickedUp means the shop has the laundry regardless of how it arrived; the
        // customer-facing label for a drop-off reads "Dropped Off". Pinned here
        // because it looks like a missing fulfilment-type guard and is not one.
        var result = order.UpdateStatus(OrderStatus.PickedUp, Now);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.PickedUp, order.Status);
    }

    [Fact]
    public void Should_Let_A_Drop_Off_Order_Skip_Straight_Into_Processing()
    {
        var order = CreateOrder(FulfillmentType.DropOff);
        Assert.True(order.Confirm(Now).IsSuccess);

        var result = order.UpdateStatus(OrderStatus.BeingProcessed, Now);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.BeingProcessed, order.Status);
    }

    [Fact]
    public void Should_Not_Let_A_Pickup_Order_Skip_Being_Collected()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        Assert.True(order.Confirm(Now).IsSuccess);

        // The shop cannot start work on laundry it has not collected yet.
        var result = order.UpdateStatus(OrderStatus.BeingProcessed, Now);

        Assert.False(result.IsSuccess);
        Assert.Equal(OrderStatus.Confirmed, order.Status);
    }

    [Fact]
    public void Should_Keep_The_Pickup_Path_Working()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        Assert.True(order.Confirm(Now).IsSuccess);

        var result = order.UpdateStatus(OrderStatus.PickedUp, Now);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.PickedUp, order.Status);
    }
}
