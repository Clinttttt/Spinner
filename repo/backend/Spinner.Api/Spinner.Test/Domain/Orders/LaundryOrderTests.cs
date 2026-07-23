using Spinner.Api.Domain.Customers;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;

namespace Spinner.Test.Domain.Orders;

public sealed class LaundryOrderTests
{
    [Fact]
    public void New_Order_Should_Start_As_BookingReceived_And_Unpaid()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);

        Assert.Equal(OrderStatus.BookingReceived, order.Status);
        Assert.Equal(PaymentStatus.Unpaid, order.PaymentStatus);
        Assert.Equal(PickupStatus.Scheduled, order.PickupStatus);
    }

    [Fact]
    public void New_Order_Should_Calculate_Estimated_Total_With_Delivery_Fee()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);

        Assert.Equal(340m, order.EstimatedServiceAmount);
        Assert.Equal(30m, order.EstimatedDeliveryFee);
        Assert.Equal(370m, order.EstimatedTotalAmount);
    }

    [Fact]
    public void New_DropOff_Order_Should_Not_Include_Delivery_Fee()
    {
        var order = CreateOrder(FulfillmentType.DropOff);

        Assert.Equal(340m, order.EstimatedServiceAmount);
        Assert.Equal(0m, order.EstimatedDeliveryFee);
        Assert.Equal(340m, order.EstimatedTotalAmount);
        Assert.Null(order.PickupStatus);
    }

    [Fact]
    public void Confirm_Should_Succeed_When_Order_Is_BookingReceived()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);

        var result = order.Confirm(DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.Confirmed, order.Status);
    }

    [Fact]
    public void Confirm_Should_Fail_When_Order_Is_Already_Confirmed()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);

        var result = order.Confirm(DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.Equal(OrderStatus.Confirmed, order.Status);
    }

    [Fact]
    public void Reject_Should_Set_Rejected_When_Order_Is_BookingReceived()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);

        var result = order.Reject(DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.Rejected, order.Status);
    }

    [Fact]
    public void Reschedule_Should_Fail_When_Order_Is_Rejected()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Reject(DateTimeOffset.UtcNow);

        var result = order.Reschedule(
            DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(2)),
            "9:00 AM - 11:00 AM",
            DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.Equal(OrderStatus.Rejected, order.Status);
    }

    [Fact]
    public void UpdateStatus_Should_Allow_Confirmed_To_PickedUp()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);

        var result = order.UpdateStatus(OrderStatus.PickedUp, DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.PickedUp, order.Status);
    }

    [Fact]
    public void UpdateStatus_Should_Fail_For_Invalid_Jump()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);

        var result = order.UpdateStatus(OrderStatus.ReadyForDelivery, DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.Equal(OrderStatus.BookingReceived, order.Status);
    }

    [Fact]
    public void UpdateStatus_Should_Fail_When_Completing_Unpaid_Order()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);
        order.UpdateStatus(OrderStatus.PickedUp, DateTimeOffset.UtcNow);
        order.UpdateStatus(OrderStatus.BeingProcessed, DateTimeOffset.UtcNow);
        order.UpdateStatus(OrderStatus.ReadyForDelivery, DateTimeOffset.UtcNow);

        var result = order.UpdateStatus(OrderStatus.Completed, DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.Equal(OrderStatus.ReadyForDelivery, order.Status);
    }

    [Fact]
    public void MarkPickedUp_Should_Set_Order_And_Pickup_Status_When_Confirmed()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);

        var result = order.MarkPickedUp(DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.PickedUp, order.Status);
        Assert.Equal(PickupStatus.PickedUp, order.PickupStatus);
        Assert.Null(order.PickupFailureReason);
        Assert.NotNull(order.PickupUpdatedAt);
    }

    [Fact]
    public void MarkPickedUp_Should_Fail_For_DropOff_Order()
    {
        var order = CreateOrder(FulfillmentType.DropOff);
        order.Confirm(DateTimeOffset.UtcNow);

        var result = order.MarkPickedUp(DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.Null(order.PickupStatus);
        Assert.Equal(OrderStatus.Confirmed, order.Status);
    }

    [Fact]
    public void FailPickup_Should_Set_FailedPickup_And_Keep_Order_Confirmed()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);

        var result = order.FailPickup("Customer not available", DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.Confirmed, order.Status);
        Assert.Equal(PickupStatus.FailedPickup, order.PickupStatus);
        Assert.Equal("Customer not available", order.PickupFailureReason);
    }

    [Fact]
    public void ReschedulePickup_Should_Update_Schedule_And_Pickup_Status()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);
        var newDate = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(3));

        var result = order.ReschedulePickup(newDate, "9:00 AM - 11:00 AM", DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.Confirmed, order.Status);
        Assert.Equal(PickupStatus.Rescheduled, order.PickupStatus);
        Assert.Equal(newDate, order.PreferredDate);
        Assert.Equal("9:00 AM - 11:00 AM", order.PreferredTimeWindow);
    }

    [Fact]
    public void MarkBeingProcessed_Should_Succeed_When_Order_Is_PickedUp()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);
        order.MarkPickedUp(DateTimeOffset.UtcNow);

        var result = order.MarkBeingProcessed(DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.BeingProcessed, order.Status);
    }

    [Fact]
    public void MarkBeingProcessed_Should_Fail_When_Order_Is_Only_Confirmed()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);

        var result = order.MarkBeingProcessed(DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.Equal(OrderStatus.Confirmed, order.Status);
    }

    [Fact]
    public void MarkReadyForDelivery_Should_Succeed_When_Order_Is_BeingProcessed()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);
        order.MarkPickedUp(DateTimeOffset.UtcNow);
        order.MarkBeingProcessed(DateTimeOffset.UtcNow);

        var result = order.MarkReadyForDelivery(DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.ReadyForDelivery, order.Status);
        Assert.Equal(DeliveryStatus.Ready, order.DeliveryStatus);
    }

    [Fact]
    public void MarkOutForDelivery_Should_Succeed_When_Delivery_Is_Ready()
    {
        var order = CreateReadyForDeliveryOrder();

        var result = order.MarkOutForDelivery(DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(DeliveryStatus.OutForDelivery, order.DeliveryStatus);
    }

    [Fact]
    public void MarkDelivered_Should_Succeed_When_Order_Is_OutForDelivery()
    {
        var order = CreateReadyForDeliveryOrder();
        order.MarkOutForDelivery(DateTimeOffset.UtcNow);

        var result = order.MarkDelivered(DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.ReadyForDelivery, order.Status);
        Assert.Equal(DeliveryStatus.Delivered, order.DeliveryStatus);
    }

    [Fact]
    public void MarkDelivered_Should_Fail_When_Delivery_Is_Not_OutForDelivery()
    {
        var order = CreateReadyForDeliveryOrder();

        var result = order.MarkDelivered(DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.Equal(DeliveryStatus.Ready, order.DeliveryStatus);
    }

    [Fact]
    public void FailDelivery_Should_Set_FailedDelivery_And_Reason()
    {
        var order = CreateReadyForDeliveryOrder();

        var result = order.FailDelivery("Customer not home", DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.ReadyForDelivery, order.Status);
        Assert.Equal(DeliveryStatus.FailedDelivery, order.DeliveryStatus);
        Assert.Equal("Customer not home", order.DeliveryFailureReason);
    }

    [Fact]
    public void ConfirmCodPayment_Should_Mark_Cod_Order_Paid_And_Set_Receipt()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);

        var result = order.ConfirmCodPayment("DR-TEST", DateTimeOffset.UtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(PaymentStatus.Paid, order.PaymentStatus);
        Assert.Equal("DR-TEST", order.ReceiptCode);
        Assert.NotNull(order.PaidAt);
    }

    [Fact]
    public void ConfirmCodPayment_Should_Fail_For_QrCodeOnlinePayment_Order()
    {
        var order = CreateOrder(
            FulfillmentType.PickupAndDelivery,
            PaymentMethod.QrCodeOnlinePayment);
        order.Confirm(DateTimeOffset.UtcNow);

        var result = order.ConfirmCodPayment("DR-TEST", DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.Equal(PaymentStatus.Unpaid, order.PaymentStatus);
        Assert.Null(order.ReceiptCode);
    }

    [Fact]
    public void ConfirmCodPayment_Should_Fail_When_Already_Paid()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);
        order.ConfirmCodPayment("DR-TEST", DateTimeOffset.UtcNow);

        var result = order.ConfirmCodPayment("DR-TEST-2", DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.Equal("DR-TEST", order.ReceiptCode);
    }

    private static LaundryOrder CreateReadyForDeliveryOrder()
    {
        var order = CreateOrder(FulfillmentType.PickupAndDelivery);
        order.Confirm(DateTimeOffset.UtcNow);
        order.MarkPickedUp(DateTimeOffset.UtcNow);
        order.MarkBeingProcessed(DateTimeOffset.UtcNow);
        order.MarkReadyForDelivery(DateTimeOffset.UtcNow);

        return order;
    }

    private static LaundryOrder CreateOrder(
        FulfillmentType fulfillmentType,
        PaymentMethod paymentMethod = PaymentMethod.CashOnDelivery)
    {
        var now = DateTimeOffset.UtcNow;
        var customer = new Customer("Maria Santos", "09171234567", null, now);
        var service = new LaundryService(
            "Wash, Dry & Fold",
            null,
            "load",
            170m,
            supportsPickupAndDelivery: true,
            deliveryFee: 30m,
            now);

        return new LaundryOrder(
            "ES-TEST",
            "TRK-TEST",
            customer,
            service,
            fulfillmentType,
            "Brgy. 10",
            DateOnly.FromDateTime(DateTime.UtcNow.Date),
            "6:00 AM - 8:00 AM",
            paymentMethod,
            loadCount: 2,
            null,
            now);
    }
}
