using Microsoft.EntityFrameworkCore;
using Spinner.Api.Features.Bookings.GetBookingConfirmation;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Bookings;

/// <summary>
/// The booking confirmation is readable without an account, because a customer tracking
/// their laundry has none. Booking codes travel, though: they are quoted in messages, shown
/// in screenshots and read out over the counter. So this endpoint has to answer "where is my
/// laundry" without also handing over the customer's phone number and email address, which
/// the customer site never displays from here anyway.
/// </summary>
public sealed class BookingConfirmationDisclosureTests
{
    [Fact]
    public async Task Should_Not_Return_The_Full_Contact_Details()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        var order = await dbContext.LaundryOrders
            .Include(item => item.Customer)
            .SingleAsync(item => item.Id == created.Value!.OrderId);

        var mobile = order.Customer.MobileNumber;

        var result = await new GetBookingConfirmationHandler(dbContext).Handle(
            new GetBookingConfirmationQuery(order.OrderCode),
            CancellationToken.None);

        Assert.True(result.IsSuccess);

        // Enough to recognise, not enough to harvest.
        Assert.NotEqual(mobile, result.Value!.MobileNumber);
        Assert.EndsWith(mobile[^4..], result.Value.MobileNumber);
        Assert.DoesNotContain(mobile[..^4], result.Value.MobileNumber);
    }

    [Fact]
    public async Task Should_Still_Answer_What_The_Customer_Came_For()
    {
        // The masking must not cost the customer the thing they looked up.
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        var order = await dbContext.LaundryOrders.SingleAsync(item => item.Id == created.Value!.OrderId);

        var result = await new GetBookingConfirmationHandler(dbContext).Handle(
            new GetBookingConfirmationQuery(order.OrderCode),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(order.OrderCode, result.Value!.OrderCode);
        Assert.Equal(order.Status, result.Value.Status);
        Assert.Equal(order.EstimatedTotalAmount, result.Value.EstimatedTotalAmount);
    }

    [Fact]
    public async Task Should_Accept_The_Tracking_Code_As_Well()
    {
        // The confirmation shows both codes, so a customer types whichever they see.
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        var order = await dbContext.LaundryOrders.SingleAsync(item => item.Id == created.Value!.OrderId);

        var result = await new GetBookingConfirmationHandler(dbContext).Handle(
            new GetBookingConfirmationQuery(order.TrackingCode.ToLowerInvariant()),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(order.OrderCode, result.Value!.OrderCode);
    }
}
