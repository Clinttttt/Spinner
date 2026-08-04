using Microsoft.EntityFrameworkCore;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.Operations.GetNewBookingRequests;
using Spinner.Api.Features.Orders.ArchiveOrder;
using Spinner.Api.Features.Orders.CancelOrder;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Operations;

/// <summary>
/// The owner's new-requests list is what they act on first, so anything appearing
/// here that is not actually awaiting their approval sends them to the wrong screen.
/// </summary>
public sealed class NewBookingRequestsTests
{
    [Fact]
    public async Task Should_List_Only_Bookings_Still_Awaiting_Approval()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var waiting = await BookingTestData.CreateBookingAsync(dbContext, fullName: "Waiting Wanda");
        var confirmed = await BookingTestData.CreateBookingAsync(dbContext, fullName: "Confirmed Carl");
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(confirmed.Value!.OrderId), CancellationToken.None);

        var result = await new GetNewBookingRequestsHandler(dbContext)
            .Handle(new GetNewBookingRequestsQuery(), CancellationToken.None);

        var listed = Assert.Single(result.Value!);
        Assert.Equal(waiting.Value!.OrderCode, listed.OrderCode);
        // Once approved it belongs to the working lists, not the inbox.
        Assert.Equal("Waiting Wanda", listed.CustomerName);
    }

    [Fact]
    public async Task Should_Only_Consider_Bookings_That_Came_From_The_Customer_Site()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await BookingTestData.CreateBookingAsync(dbContext);

        // Flip the source to prove the filter, rather than asserting around it: an
        // owner-typed order is not a request waiting for the owner's approval.
        var order = await dbContext.LaundryOrders.FirstAsync();
        dbContext.Entry(order).Property(nameof(LaundryOrder.Source)).CurrentValue =
            OrderSource.OwnerManual;
        await dbContext.SaveChangesAsync();

        var result = await new GetNewBookingRequestsHandler(dbContext)
            .Handle(new GetNewBookingRequestsQuery(), CancellationToken.None);

        Assert.Empty(result.Value!);
    }

    [Fact]
    public async Task Should_Drop_A_Booking_That_Was_Cancelled_And_Cleared()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        var orderId = created.Value!.OrderId;
        var clock = new TestBusinessClock();

        await new CancelOrderHandler(dbContext, clock)
            .Handle(new CancelOrderCommand(orderId), CancellationToken.None);
        await new ArchiveOrderHandler(dbContext, clock)
            .Handle(new ArchiveOrderCommand(orderId, true), CancellationToken.None);

        var result = await new GetNewBookingRequestsHandler(dbContext)
            .Handle(new GetNewBookingRequestsQuery(), CancellationToken.None);

        // Tidied away means gone from the inbox too.
        Assert.Empty(result.Value!);
    }

    [Fact]
    public async Task Should_Show_The_Name_Each_Booking_Was_Made_Under()
    {
        await using var dbContext = AppDbContextFactory.Create();
        const string shared = "09384326772";

        await BookingTestData.CreateBookingAsync(
            dbContext, fullName: "Maria Santos", mobileNumber: shared);
        await BookingTestData.CreateBookingAsync(
            dbContext, fullName: "Viz Goc", mobileNumber: shared);

        var result = await new GetNewBookingRequestsHandler(dbContext)
            .Handle(new GetNewBookingRequestsQuery(), CancellationToken.None);

        var names = result.Value!.Select(item => item.CustomerName).OrderBy(name => name).ToList();

        // Two requests from one phone must still be told apart.
        Assert.Equal(["Maria Santos", "Viz Goc"], names);
    }
}
