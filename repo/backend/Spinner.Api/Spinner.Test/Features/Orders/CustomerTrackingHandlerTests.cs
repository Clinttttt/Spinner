using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Api.Features.Orders.GetCustomerTracking;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Orders;

public sealed class CustomerTrackingHandlerTests
{
    [Fact]
    public async Task GetCustomerTracking_Should_Return_Public_Tracking_Data()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);

        var result = await new GetCustomerTrackingHandler(dbContext)
            .Handle(new GetCustomerTrackingQuery(created.Value.TrackingCode), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(created.Value.OrderCode, result.Value!.OrderCode);
        Assert.Equal(OrderStatus.Confirmed, result.Value.Status);
        Assert.Equal("Confirmed", result.Value.CustomerFacingStatus);
        Assert.Equal("Maria Santos", result.Value.CustomerName);
    }

    [Fact]
    public async Task GetCustomerTracking_Should_Adapt_DropOff_Labels()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext, fulfillmentType: FulfillmentType.DropOff);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);
        var order = await dbContext.LaundryOrders.FindAsync(created.Value.OrderId);
        order!.UpdateStatus(OrderStatus.PickedUp, DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync();

        var result = await new GetCustomerTrackingHandler(dbContext)
            .Handle(new GetCustomerTrackingQuery(created.Value.TrackingCode), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.PickedUp, result.Value!.Status);
        Assert.Equal("Dropped Off", result.Value.CustomerFacingStatus);
    }

    [Fact]
    public async Task GetCustomerTracking_Should_Return_NotFound_When_Code_Does_Not_Exist()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await new GetCustomerTrackingHandler(dbContext)
            .Handle(new GetCustomerTrackingQuery("TRK-MISSING"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.NotFound, result.Status);
    }
}
