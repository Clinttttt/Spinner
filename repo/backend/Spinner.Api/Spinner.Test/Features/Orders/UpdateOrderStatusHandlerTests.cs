using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.Orders.UpdateOrderStatus;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Orders;

public sealed class UpdateOrderStatusHandlerTests
{
    [Fact]
    public async Task UpdateOrderStatus_Should_Apply_Valid_Status_Transition()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);

        var result = await new UpdateOrderStatusHandler(dbContext)
            .Handle(new UpdateOrderStatusCommand(created.Value.OrderId, OrderStatus.PickedUp), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.PickedUp, result.Value!.Status);
    }

    [Fact]
    public async Task UpdateOrderStatus_Should_Return_Conflict_For_Invalid_Jump()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);

        var result = await new UpdateOrderStatusHandler(dbContext)
            .Handle(new UpdateOrderStatusCommand(created.Value!.OrderId, OrderStatus.ReadyForDelivery), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task UpdateOrderStatus_Should_Return_NotFound_When_Order_Does_Not_Exist()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await new UpdateOrderStatusHandler(dbContext)
            .Handle(new UpdateOrderStatusCommand(Guid.NewGuid(), OrderStatus.PickedUp), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.NotFound, result.Status);
    }
}
