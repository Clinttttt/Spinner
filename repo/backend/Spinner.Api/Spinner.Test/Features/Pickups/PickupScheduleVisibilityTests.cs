using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.Orders.ArchiveOrder;
using Spinner.Api.Features.Pickups.GetPickupSchedule;
using Spinner.Api.Features.Pickups.MarkPickedUp;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Pickups;

/// <summary>
/// The pickup schedule used to hide unconfirmed, collected, and completed jobs,
/// which left the owner's Pickup tab permanently empty and pushed staff into
/// re-entering the same job as a manual order.
/// </summary>
public sealed class PickupScheduleVisibilityTests
{
    [Fact]
    public async Task Should_Include_Bookings_Still_Awaiting_Confirmation()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        var order = await dbContext.LaundryOrders
            .SingleAsync(item => item.Id == created.Value!.OrderId);

        var result = await new GetPickupScheduleHandler(dbContext)
            .Handle(new GetPickupScheduleQuery(order.PreferredDate), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var pickup = Assert.Single(result.Value!.Items);
        Assert.Equal(OrderStatus.BookingReceived, pickup.OrderStatus);
        Assert.True(pickup.AwaitingConfirmation);
    }

    [Fact]
    public async Task Should_Include_Collected_Pickups_So_The_Completed_Tab_Can_Fill()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);
        await new MarkPickedUpHandler(dbContext)
            .Handle(new MarkPickedUpCommand(created.Value.OrderId), CancellationToken.None);

        var order = await dbContext.LaundryOrders
            .SingleAsync(item => item.Id == created.Value.OrderId);

        var result = await new GetPickupScheduleHandler(dbContext)
            .Handle(new GetPickupScheduleQuery(order.PreferredDate), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var pickup = Assert.Single(result.Value!.Items);
        Assert.Equal(PickupStatus.PickedUp, pickup.PickupStatus);
        Assert.False(pickup.AwaitingConfirmation);
    }

    [Fact]
    public async Task Should_Exclude_Collected_Pickups_When_Caller_Opts_Out()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);
        await new MarkPickedUpHandler(dbContext)
            .Handle(new MarkPickedUpCommand(created.Value.OrderId), CancellationToken.None);

        var order = await dbContext.LaundryOrders
            .SingleAsync(item => item.Id == created.Value.OrderId);

        var result = await new GetPickupScheduleHandler(dbContext).Handle(
            new GetPickupScheduleQuery(order.PreferredDate, IncludeCollected: false),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Items);
    }

    [Fact]
    public async Task Should_Exclude_Rejected_Bookings()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        var order = await dbContext.LaundryOrders
            .SingleAsync(item => item.Id == created.Value!.OrderId);
        order.Reject(DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync();

        var result = await new GetPickupScheduleHandler(dbContext)
            .Handle(new GetPickupScheduleQuery(order.PreferredDate), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Items);
    }

    [Fact]
    public async Task Should_Exclude_Cleared_Pickups()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CompleteBookingAsync(dbContext);
        var order = await dbContext.LaundryOrders.SingleAsync(item => item.Id == orderId);

        var archived = await new ArchiveOrderHandler(dbContext, new TestBusinessClock())
            .Handle(new ArchiveOrderCommand(orderId, true), CancellationToken.None);
        Assert.True(archived.IsSuccess);

        var result = await new GetPickupScheduleHandler(dbContext)
            .Handle(new GetPickupScheduleQuery(order.PreferredDate), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Items);
    }

    [Fact]
    public async Task Should_Carry_The_Stored_Map_Pin()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(
            dbContext,
            pickupLocation: new Spinner.Api.Features.Orders.PickupLocationRequest(
                "Purok 3, San Vicente, Cabadbaran City",
                9.1234567m,
                125.5345678m,
                null,
                null,
                "San Vicente",
                "Cabadbaran City",
                "Beside the blue gate",
                null,
                "currentLocation",
                true,
                DateTimeOffset.UtcNow));

        var order = await dbContext.LaundryOrders
            .SingleAsync(item => item.Id == created.Value!.OrderId);

        var result = await new GetPickupScheduleHandler(dbContext)
            .Handle(new GetPickupScheduleQuery(order.PreferredDate), CancellationToken.None);

        var pickup = Assert.Single(result.Value!.Items);
        Assert.NotNull(pickup.PickupLocation);
        Assert.Equal(9.1234567m, pickup.PickupLocation!.Latitude);
        Assert.Equal(125.5345678m, pickup.PickupLocation.Longitude);
        Assert.Equal("Beside the blue gate", pickup.PickupLocation.Landmark);
        Assert.True(pickup.PickupLocation.LocationConfirmed);
    }

    private static async Task<Guid> CompleteBookingAsync(AppDbContext dbContext)
    {
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        var orderId = created.Value!.OrderId;
        var order = await dbContext.LaundryOrders.SingleAsync(item => item.Id == orderId);
        var now = DateTimeOffset.UtcNow;

        Assert.True(order.Confirm(now).IsSuccess);
        Assert.True(order.MarkPickedUp(now).IsSuccess);
        Assert.True(order.MarkBeingProcessed(now).IsSuccess);
        Assert.True(order.MarkReadyForDelivery(now).IsSuccess);
        Assert.True(order.ConfirmCodPayment("RC-1", now).IsSuccess);
        Assert.True(order.UpdateStatus(OrderStatus.Completed, now).IsSuccess);
        await dbContext.SaveChangesAsync();

        return orderId;
    }
}
