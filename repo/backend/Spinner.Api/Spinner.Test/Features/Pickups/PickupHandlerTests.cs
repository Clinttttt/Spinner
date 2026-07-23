using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.Pickups.FailPickup;
using Spinner.Api.Features.Pickups.GetPickupDetails;
using Spinner.Api.Features.Pickups.GetPickupSchedule;
using Spinner.Api.Features.Pickups.MarkPickedUp;
using Spinner.Api.Features.Pickups.ReschedulePickup;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Pickups;

public sealed class PickupHandlerTests
{
    [Fact]
    public async Task GetPickupSchedule_Should_Return_Confirmed_Pickups_For_Date()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateConfirmedPickupAsync(dbContext);
        var order = await dbContext.LaundryOrders.SingleAsync(order => order.Id == orderId);

        var result = await new GetPickupScheduleHandler(dbContext)
            .Handle(new GetPickupScheduleQuery(order.PreferredDate), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var pickup = Assert.Single(result.Value!.Items);
        Assert.Equal(1, result.Value.TotalCount);
        Assert.Equal(orderId, pickup.OrderId);
        Assert.Equal(PickupStatus.Scheduled, pickup.PickupStatus);
        Assert.Equal(OrderStatus.Confirmed, pickup.OrderStatus);
    }

    [Fact]
    public async Task GetPickupDetails_Should_Return_Pickup_Details()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateConfirmedPickupAsync(dbContext);

        var result = await new GetPickupDetailsHandler(dbContext)
            .Handle(new GetPickupDetailsQuery(orderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(orderId, result.Value!.OrderId);
        Assert.Equal(FulfillmentType.PickupAndDelivery, result.Value.FulfillmentType);
        Assert.Equal(PickupStatus.Scheduled, result.Value.PickupStatus);
    }

    [Fact]
    public async Task MarkPickedUp_Should_Update_Statuses_And_Queue_Sms()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateConfirmedPickupAsync(dbContext);
        dbContext.NotificationOutboxMessages.RemoveRange(dbContext.NotificationOutboxMessages);
        await dbContext.SaveChangesAsync();

        var result = await new MarkPickedUpHandler(dbContext)
            .Handle(new MarkPickedUpCommand(orderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.PickedUp, result.Value!.OrderStatus);
        Assert.Equal(PickupStatus.PickedUp, result.Value.PickupStatus);

        var message = await dbContext.NotificationOutboxMessages.SingleAsync();
        Assert.Equal(orderId, message.OrderId);
        Assert.Equal(NotificationChannel.Sms, message.Channel);
        Assert.Contains("picked up", message.Message);
    }

    [Fact]
    public async Task MarkPickedUp_Should_Conflict_When_Order_Is_Not_Confirmed()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);

        var result = await new MarkPickedUpHandler(dbContext)
            .Handle(new MarkPickedUpCommand(created.Value!.OrderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task FailPickup_Should_Set_Failed_Status_And_Reason()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateConfirmedPickupAsync(dbContext);

        var result = await new FailPickupHandler(dbContext)
            .Handle(new FailPickupCommand(orderId, "Customer not available"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.Confirmed, result.Value!.OrderStatus);
        Assert.Equal(PickupStatus.FailedPickup, result.Value.PickupStatus);
        Assert.Equal("Customer not available", result.Value.PickupFailureReason);
    }

    [Fact]
    public async Task ReschedulePickup_Should_Update_Schedule_And_Status()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateConfirmedPickupAsync(dbContext);
        var newDate = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(4));

        var result = await new ReschedulePickupHandler(dbContext)
            .Handle(
                new ReschedulePickupCommand(orderId, newDate, "9:00 AM - 11:00 AM"),
                CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(PickupStatus.Rescheduled, result.Value!.PickupStatus);
        Assert.Equal(newDate, result.Value.PreferredDate);
        Assert.Equal("9:00 AM - 11:00 AM", result.Value.PreferredTimeWindow);
    }

    private static async Task<Guid> CreateConfirmedPickupAsync(Spinner.Api.Database.AppDbContext dbContext)
    {
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        var confirmed = await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);

        return confirmed.Value!.OrderId;
    }
}
