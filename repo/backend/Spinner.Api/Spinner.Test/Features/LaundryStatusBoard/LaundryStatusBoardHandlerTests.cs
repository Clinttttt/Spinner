using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.LaundryStatusBoard.GetLaundryStatusBoard;
using Spinner.Api.Features.LaundryStatusBoard.MarkBeingProcessed;
using Spinner.Api.Features.LaundryStatusBoard.MarkReadyForDelivery;
using Spinner.Api.Features.Pickups.MarkPickedUp;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.LaundryStatusBoard;

public sealed class LaundryStatusBoardHandlerTests
{
    [Fact]
    public async Task GetLaundryStatusBoard_Should_Group_Received_Processing_And_Ready_Orders()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var receivedOrderId = await CreatePickedUpOrderAsync(dbContext);
        var processingOrderId = await CreateBeingProcessedOrderAsync(dbContext);
        var readyOrderId = await CreateReadyOrderAsync(dbContext);

        var result = await new GetLaundryStatusBoardHandler(dbContext)
            .Handle(new GetLaundryStatusBoardQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Contains(result.Value!.Received, item => item.OrderId == receivedOrderId);
        Assert.Contains(result.Value.BeingProcessed, item => item.OrderId == processingOrderId);
        Assert.Contains(result.Value.Ready, item => item.OrderId == readyOrderId);
    }

    [Fact]
    public async Task MarkBeingProcessed_Should_Move_PickedUp_Order_To_BeingProcessed()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreatePickedUpOrderAsync(dbContext);

        var result = await new MarkBeingProcessedHandler(dbContext)
            .Handle(new MarkBeingProcessedCommand(orderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.BeingProcessed, result.Value!.Status);
    }

    [Fact]
    public async Task MarkBeingProcessed_Should_Return_Conflict_When_Order_Is_Not_PickedUp()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);

        var result = await new MarkBeingProcessedHandler(dbContext)
            .Handle(new MarkBeingProcessedCommand(created.Value.OrderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task MarkReadyForDelivery_Should_Move_BeingProcessed_Order_To_Ready_And_Queue_Sms()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateBeingProcessedOrderAsync(dbContext);
        dbContext.NotificationOutboxMessages.RemoveRange(dbContext.NotificationOutboxMessages);
        await dbContext.SaveChangesAsync();

        var result = await new MarkReadyForDeliveryHandler(dbContext)
            .Handle(new MarkReadyForDeliveryCommand(orderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.ReadyForDelivery, result.Value!.Status);

        var message = await dbContext.NotificationOutboxMessages.SingleAsync();
        Assert.Equal(orderId, message.OrderId);
        Assert.Equal(NotificationChannel.Sms, message.Channel);
        Assert.Contains("ready for delivery", message.Message);
    }

    [Fact]
    public async Task MarkReadyForDelivery_Should_Return_Conflict_When_Order_Is_Not_BeingProcessed()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreatePickedUpOrderAsync(dbContext);

        var result = await new MarkReadyForDeliveryHandler(dbContext)
            .Handle(new MarkReadyForDeliveryCommand(orderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    private static async Task<Guid> CreatePickedUpOrderAsync(Spinner.Api.Database.AppDbContext dbContext)
    {
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);
        var pickedUp = await new MarkPickedUpHandler(dbContext)
            .Handle(new MarkPickedUpCommand(created.Value.OrderId), CancellationToken.None);

        return pickedUp.Value!.OrderId;
    }

    private static async Task<Guid> CreateBeingProcessedOrderAsync(Spinner.Api.Database.AppDbContext dbContext)
    {
        var orderId = await CreatePickedUpOrderAsync(dbContext);
        var processed = await new MarkBeingProcessedHandler(dbContext)
            .Handle(new MarkBeingProcessedCommand(orderId), CancellationToken.None);

        return processed.Value!.OrderId;
    }

    private static async Task<Guid> CreateReadyOrderAsync(Spinner.Api.Database.AppDbContext dbContext)
    {
        var orderId = await CreateBeingProcessedOrderAsync(dbContext);
        var ready = await new MarkReadyForDeliveryHandler(dbContext)
            .Handle(new MarkReadyForDeliveryCommand(orderId), CancellationToken.None);

        return ready.Value!.OrderId;
    }
}
