using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings.GetBookings;
using Spinner.Api.Features.Orders.ArchiveOrder;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Orders;

public sealed class ArchiveOrderHandlerTests
{
    [Fact]
    public async Task Should_Clear_A_Completed_Order_From_The_Active_List()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CompleteBookingAsync(dbContext);

        var result = await new ArchiveOrderHandler(dbContext, new TestBusinessClock())
            .Handle(new ArchiveOrderCommand(orderId, true), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value!.ArchivedAt);

        var active = await new GetBookingsHandler(dbContext)
            .Handle(new GetBookingsQuery(null, null), CancellationToken.None);
        Assert.Empty(active.Value!.Items);

        var includingCleared = await new GetBookingsHandler(dbContext).Handle(
            new GetBookingsQuery(null, null, IncludeCleared: true),
            CancellationToken.None);
        Assert.Single(includingCleared.Value!.Items);
    }

    [Fact]
    public async Task Should_Refuse_To_Clear_An_Order_That_Is_Still_In_Progress()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);

        var result = await new ArchiveOrderHandler(dbContext, new TestBusinessClock())
            .Handle(new ArchiveOrderCommand(created.Value!.OrderId, true), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task Should_Restore_A_Cleared_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CompleteBookingAsync(dbContext);
        var clock = new TestBusinessClock();

        await new ArchiveOrderHandler(dbContext, clock)
            .Handle(new ArchiveOrderCommand(orderId, true), CancellationToken.None);
        var restored = await new ArchiveOrderHandler(dbContext, clock)
            .Handle(new ArchiveOrderCommand(orderId, false), CancellationToken.None);

        Assert.True(restored.IsSuccess);
        Assert.Null(restored.Value!.ArchivedAt);
    }

    [Fact]
    public async Task Should_Be_Idempotent_When_Clearing_Twice()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CompleteBookingAsync(dbContext);
        var clock = new TestBusinessClock();

        await new ArchiveOrderHandler(dbContext, clock)
            .Handle(new ArchiveOrderCommand(orderId, true), CancellationToken.None);
        var second = await new ArchiveOrderHandler(dbContext, clock)
            .Handle(new ArchiveOrderCommand(orderId, true), CancellationToken.None);

        Assert.True(second.IsSuccess);
        Assert.NotNull(second.Value!.ArchivedAt);
    }

    [Fact]
    public async Task Should_Report_Not_Found_For_An_Unknown_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await new ArchiveOrderHandler(dbContext, new TestBusinessClock())
            .Handle(new ArchiveOrderCommand(Guid.NewGuid(), true), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.NotFound, result.Status);
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
