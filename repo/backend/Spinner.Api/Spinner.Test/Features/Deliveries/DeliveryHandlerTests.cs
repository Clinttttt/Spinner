using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.Deliveries.FailDelivery;
using Spinner.Api.Features.Deliveries.GetDeliveryDetails;
using Spinner.Api.Features.Deliveries.GetDeliverySchedule;
using Spinner.Api.Features.Deliveries.MarkDelivered;
using Spinner.Api.Features.Deliveries.MarkOutForDelivery;
using Spinner.Api.Features.LaundryStatusBoard.MarkBeingProcessed;
using Spinner.Api.Features.LaundryStatusBoard.MarkReadyForDelivery;
using Spinner.Api.Features.Pickups.MarkPickedUp;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Deliveries;

public sealed class DeliveryHandlerTests
{
    [Fact]
    public async Task GetDeliverySchedule_Should_Return_Ready_Delivery_Orders()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateReadyDeliveryAsync(dbContext);
        var order = await dbContext.LaundryOrders.SingleAsync(order => order.Id == orderId);

        var result = await new GetDeliveryScheduleHandler(dbContext)
            .Handle(new GetDeliveryScheduleQuery(order.PreferredDate), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var delivery = Assert.Single(result.Value!);
        Assert.Equal(orderId, delivery.OrderId);
        Assert.Equal(DeliveryStatus.Ready, delivery.DeliveryStatus);
        Assert.Equal(PaymentStatus.Unpaid, delivery.PaymentStatus);
        Assert.Equal(order.EstimatedTotalAmount, delivery.AmountToCollect);
    }

    [Fact]
    public async Task GetDeliveryDetails_Should_Return_Delivery_Details()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateReadyDeliveryAsync(dbContext);

        var result = await new GetDeliveryDetailsHandler(dbContext)
            .Handle(new GetDeliveryDetailsQuery(orderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(orderId, result.Value!.OrderId);
        Assert.Equal(DeliveryStatus.Ready, result.Value.DeliveryStatus);
        Assert.True(result.Value.AmountToCollect > 0);
    }

    [Fact]
    public async Task MarkOutForDelivery_Should_Set_Delivery_Status()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateReadyDeliveryAsync(dbContext);

        var result = await new MarkOutForDeliveryHandler(dbContext)
            .Handle(new MarkOutForDeliveryCommand(orderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(DeliveryStatus.OutForDelivery, result.Value!.DeliveryStatus);
        Assert.Equal(OrderStatus.ReadyForDelivery, result.Value.OrderStatus);
    }

    [Fact]
    public async Task MarkDelivered_Should_Set_Delivered_Without_Completing_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateOutForDeliveryAsync(dbContext);

        var result = await new MarkDeliveredHandler(dbContext)
            .Handle(new MarkDeliveredCommand(orderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(DeliveryStatus.Delivered, result.Value!.DeliveryStatus);
        Assert.Equal(OrderStatus.ReadyForDelivery, result.Value.OrderStatus);
    }

    [Fact]
    public async Task MarkDelivered_Should_Return_Conflict_When_Not_OutForDelivery()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateReadyDeliveryAsync(dbContext);

        var result = await new MarkDeliveredHandler(dbContext)
            .Handle(new MarkDeliveredCommand(orderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task FailDelivery_Should_Set_FailedDelivery_And_Queue_Sms()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateOutForDeliveryAsync(dbContext);
        dbContext.NotificationOutboxMessages.RemoveRange(dbContext.NotificationOutboxMessages);
        await dbContext.SaveChangesAsync();

        var result = await new FailDeliveryHandler(dbContext)
            .Handle(new FailDeliveryCommand(orderId, "Customer not home"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(DeliveryStatus.FailedDelivery, result.Value!.DeliveryStatus);
        Assert.Equal("Customer not home", result.Value.DeliveryFailureReason);

        var message = await dbContext.NotificationOutboxMessages.SingleAsync();
        Assert.Equal(orderId, message.OrderId);
        Assert.Equal(NotificationChannel.Sms, message.Channel);
        Assert.Contains("not completed", message.Message);
    }

    [Fact]
    public async Task Delivery_Actions_Should_Conflict_For_DropOff_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext, FulfillmentType.DropOff);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);

        var result = await new MarkOutForDeliveryHandler(dbContext)
            .Handle(new MarkOutForDeliveryCommand(created.Value.OrderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    private static async Task<Guid> CreateReadyDeliveryAsync(Spinner.Api.Database.AppDbContext dbContext)
    {
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);
        await new MarkPickedUpHandler(dbContext)
            .Handle(new MarkPickedUpCommand(created.Value.OrderId), CancellationToken.None);
        await new MarkBeingProcessedHandler(dbContext)
            .Handle(new MarkBeingProcessedCommand(created.Value.OrderId), CancellationToken.None);
        var ready = await new MarkReadyForDeliveryHandler(dbContext)
            .Handle(new MarkReadyForDeliveryCommand(created.Value.OrderId), CancellationToken.None);

        return ready.Value!.OrderId;
    }

    private static async Task<Guid> CreateOutForDeliveryAsync(Spinner.Api.Database.AppDbContext dbContext)
    {
        var orderId = await CreateReadyDeliveryAsync(dbContext);
        var outForDelivery = await new MarkOutForDeliveryHandler(dbContext)
            .Handle(new MarkOutForDeliveryCommand(orderId), CancellationToken.None);

        return outForDelivery.Value!.OrderId;
    }
}
