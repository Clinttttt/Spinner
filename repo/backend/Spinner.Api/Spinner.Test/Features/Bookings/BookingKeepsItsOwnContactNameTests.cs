using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;
using Spinner.Api.Features.Bookings.GetBookings;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Bookings;

/// <summary>
/// One customer record is matched by mobile number and its name is refreshed on
/// every booking. Order lists used to read the name through that record, so a new
/// booking rewrote the name on all of that customer's earlier orders. Three separate
/// bookings then appeared under one name and read as the same booking repeated.
/// </summary>
public sealed class BookingKeepsItsOwnContactNameTests
{
    private const string SharedMobile = "09384326772";

    [Fact]
    public async Task Should_Not_Rename_Earlier_Orders_When_The_Same_Number_Books_Again()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var first = await BookingTestData.CreateBookingAsync(
            dbContext, fullName: "Maria Santos", mobileNumber: SharedMobile);
        var second = await BookingTestData.CreateBookingAsync(
            dbContext, fullName: "Viz Goc", mobileNumber: SharedMobile);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);

        var orders = await dbContext.LaundryOrders
            .OrderBy(order => order.CreatedAt)
            .ToListAsync();

        Assert.Equal(2, orders.Count);
        // The same person, so one customer record - that part is intended.
        Assert.Single(orders.Select(order => order.CustomerId).Distinct());

        Assert.Equal("Maria Santos", orders[0].ContactName);
        Assert.Equal("Viz Goc", orders[1].ContactName);
    }

    [Fact]
    public async Task Should_List_Each_Booking_Under_The_Name_It_Was_Booked_With()
    {
        await using var dbContext = AppDbContextFactory.Create();

        await BookingTestData.CreateBookingAsync(
            dbContext, fullName: "Maria Santos", mobileNumber: SharedMobile);
        await BookingTestData.CreateBookingAsync(
            dbContext, fullName: "Viz Goc", mobileNumber: SharedMobile);

        var result = await new GetBookingsHandler(dbContext)
            .Handle(new GetBookingsQuery(null, null, 1, 20, false), CancellationToken.None);

        var names = result.Value!.Items.Select(item => item.CustomerName).OrderBy(name => name).ToList();

        // Two distinct rows the owner can tell apart, which is the whole point.
        Assert.Equal(["Maria Santos", "Viz Goc"], names);
    }

    [Fact]
    public async Task Should_Keep_The_Customer_Record_On_The_Latest_Name()
    {
        await using var dbContext = AppDbContextFactory.Create();

        await BookingTestData.CreateBookingAsync(
            dbContext, fullName: "Maria Santos", mobileNumber: SharedMobile);
        await BookingTestData.CreateBookingAsync(
            dbContext, fullName: "Viz Goc", mobileNumber: SharedMobile);

        var customer = await dbContext.Customers.SingleAsync(item => item.MobileNumber == SharedMobile);

        // The customer's current name still moves on; only the order history is
        // frozen. Calling them by their newest name is correct.
        Assert.Equal("Viz Goc", customer.FullName);
    }
}
