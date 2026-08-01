using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.Orders.ArchiveOrder;
using Spinner.Api.Features.Orders.CancelOrder;
using Spinner.Api.Features.Orders.UpdateOrderStatus;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Orders;

/// <summary>
/// An unpaid QR order could become permanently stuck on the owner's list: it
/// cannot be completed, because completion requires confirmed payment, and it
/// cannot be rejected, because rejection only applies to a booking still awaiting
/// approval. With no closed state reachable, clearing it was impossible too.
/// </summary>
public sealed class CancelOrderTests
{
    [Fact]
    public async Task Should_Let_An_Abandoned_Qr_Order_Be_Cancelled_Then_Cleared()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await StuckUnpaidQrOrderAsync(dbContext);

        // The state that produced the bug report.
        var stuck = await dbContext.LaundryOrders.SingleAsync(item => item.Id == orderId);
        Assert.Equal(OrderStatus.ReadyForDelivery, stuck.Status);
        Assert.Equal(PaymentStatus.Unpaid, stuck.PaymentStatus);
        Assert.False(stuck.Archive(DateTimeOffset.UtcNow).IsSuccess);

        var cancelled = await new CancelOrderHandler(dbContext, new TestBusinessClock())
            .Handle(new CancelOrderCommand(orderId), CancellationToken.None);
        Assert.True(cancelled.IsSuccess);

        var archived = await new ArchiveOrderHandler(dbContext, new TestBusinessClock())
            .Handle(new ArchiveOrderCommand(orderId, true), CancellationToken.None);
        Assert.True(archived.IsSuccess);

        var order = await dbContext.LaundryOrders.SingleAsync(item => item.Id == orderId);
        Assert.Equal(OrderStatus.Rejected, order.Status);
        Assert.True(order.IsArchived);
    }

    [Fact]
    public async Task Should_Refuse_To_Cancel_A_Paid_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        var orderId = created.Value!.OrderId;

        // Payment cannot be confirmed while the booking is still awaiting
        // approval, so the order has to be active before it can be marked paid.
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(orderId), CancellationToken.None);

        var order = await dbContext.LaundryOrders.SingleAsync(item => item.Id == orderId);
        Assert.True(order.ConfirmCodPayment("RCPT-1", DateTimeOffset.UtcNow).IsSuccess);
        await dbContext.SaveChangesAsync();
        Assert.Equal(PaymentStatus.Paid, order.PaymentStatus);

        var result = await new CancelOrderHandler(dbContext, new TestBusinessClock())
            .Handle(new CancelOrderCommand(orderId), CancellationToken.None);

        // Cancelling money that has already been taken is a refund decision.
        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
        Assert.Contains("already paid", result.Error.Message);
    }

    [Fact]
    public async Task Should_Treat_Cancelling_A_Closed_Order_As_Done()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await StuckUnpaidQrOrderAsync(dbContext);
        var clock = new TestBusinessClock();

        await new CancelOrderHandler(dbContext, clock)
            .Handle(new CancelOrderCommand(orderId), CancellationToken.None);
        var again = await new CancelOrderHandler(dbContext, clock)
            .Handle(new CancelOrderCommand(orderId), CancellationToken.None);

        // A retry from a flaky connection must not turn into an error.
        Assert.True(again.IsSuccess);
    }

    /// <summary>Walks a QR booking to Ready for Delivery without ever paying it.</summary>
    private static async Task<Guid> StuckUnpaidQrOrderAsync(AppDbContext dbContext)
    {
        var created = await BookingTestData.CreateBookingAsync(
            dbContext, paymentMethod: PaymentMethod.QrCodeOnlinePayment);
        var orderId = created.Value!.OrderId;

        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(orderId), CancellationToken.None);

        foreach (var status in new[]
                 {
                     OrderStatus.PickedUp, OrderStatus.BeingProcessed, OrderStatus.ReadyForDelivery,
                 })
        {
            var moved = await new UpdateOrderStatusHandler(dbContext)
                .Handle(new UpdateOrderStatusCommand(orderId, status), CancellationToken.None);
            Assert.True(moved.IsSuccess, $"could not move to {status}: {moved.Error?.Message}");
        }

        return orderId;
    }
}
