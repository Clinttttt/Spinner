using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Customers.GetCustomerList;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Customers;

/// <summary>
/// The list now aggregates and pages in the database. It used to read every customer
/// and then the whole orders table to produce three numbers each, which is the
/// heaviest read in the application and grows with every order taken.
/// </summary>
public sealed class CustomerListPagingTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 8, 4, 9, 0, 0, TimeSpan.FromHours(8));

    [Fact]
    public async Task Should_Count_Orders_Per_Customer()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await BookingTestData.CreateBookingAsync(dbContext, fullName: "Maria Santos", mobileNumber: "09171234567");
        await BookingTestData.CreateBookingAsync(dbContext, fullName: "Maria Santos", mobileNumber: "09171234567");
        await BookingTestData.CreateBookingAsync(dbContext, fullName: "Juan Cruz", mobileNumber: "09990001111");

        var result = await Query(dbContext, new GetCustomerListQuery(null, 1, 20));

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.TotalCount);

        // Busiest first, which is what the owner cares about.
        Assert.Equal(2, result.Value.Items[0].TotalOrders);
        Assert.Equal(1, result.Value.Items[1].TotalOrders);
    }

    [Fact]
    public async Task Should_Only_Total_What_Was_Actually_Paid()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await BookingTestData.CreateBookingAsync(dbContext, fullName: "Maria Santos", mobileNumber: "09171234567");
        await BookingTestData.CreateBookingAsync(dbContext, fullName: "Maria Santos", mobileNumber: "09171234567");

        var paid = await dbContext.LaundryOrders.OrderBy(order => order.CreatedAt).FirstAsync();
        Assert.True(paid.Confirm(Now).IsSuccess);
        Assert.True(paid.ConfirmCodPayment("RCPT-TEST", Now).IsSuccess);
        await dbContext.SaveChangesAsync();

        var result = await Query(dbContext, new GetCustomerListQuery(null, 1, 20));

        Assert.Equal(paid.EstimatedTotalAmount, result.Value!.Items[0].TotalSpent);
    }

    [Fact]
    public async Task Should_Report_Zero_Spend_For_A_Customer_Who_Has_Never_Paid()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await BookingTestData.CreateBookingAsync(dbContext);

        var result = await Query(dbContext, new GetCustomerListQuery(null, 1, 20));

        // A sum over no rows is null in SQL, so this would come back as a null total
        // rather than zero if it were not handled.
        Assert.Equal(0m, result.Value!.Items[0].TotalSpent);
    }

    [Fact]
    public async Task Should_Report_The_Most_Recent_Order_Date()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await BookingTestData.CreateBookingAsync(dbContext, fullName: "Maria Santos", mobileNumber: "09171234567");
        await BookingTestData.CreateBookingAsync(dbContext, fullName: "Maria Santos", mobileNumber: "09171234567");

        var latest = await dbContext.LaundryOrders.MaxAsync(order => order.CreatedAt);
        var result = await Query(dbContext, new GetCustomerListQuery(null, 1, 20));

        Assert.Equal(latest, result.Value!.Items[0].LastOrderAt);
    }

    [Fact]
    public async Task Should_Walk_Pages_Without_Repeating_Or_Losing_A_Customer()
    {
        await using var dbContext = AppDbContextFactory.Create();

        // All with one order each, so every row ties on the primary sort. This is the
        // case that needs the tie-break to page correctly.
        for (var i = 0; i < 5; i++)
        {
            await BookingTestData.CreateBookingAsync(
                dbContext,
                fullName: $"Customer {i}",
                mobileNumber: $"091700000{i}{i}");
        }

        var seen = new List<Guid>();
        for (var page = 1; page <= 3; page++)
        {
            var result = await Query(dbContext, new GetCustomerListQuery(null, page, 2));
            seen.AddRange(result.Value!.Items.Select(item => item.CustomerId));
        }

        Assert.Equal(5, seen.Count);
        Assert.Equal(5, seen.Distinct().Count());
    }

    [Fact]
    public async Task Should_Count_Only_Customers_Matching_The_Search()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await BookingTestData.CreateBookingAsync(dbContext, fullName: "Maria Santos", mobileNumber: "09171234567");
        await BookingTestData.CreateBookingAsync(dbContext, fullName: "Juan Cruz", mobileNumber: "09990001111");

        var result = await Query(dbContext, new GetCustomerListQuery("maria", 1, 20));

        // The total has to reflect the filter, or the client pages through pages that
        // are not there.
        Assert.Equal(1, result.Value!.TotalCount);
        Assert.Equal("Maria Santos", result.Value.Items[0].FullName);
    }

    [Fact]
    public async Task Should_Find_A_Customer_By_Mobile_Number()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await BookingTestData.CreateBookingAsync(dbContext, mobileNumber: "09171234567");

        var result = await Query(dbContext, new GetCustomerListQuery("0917123", 1, 20));

        Assert.Equal(1, result.Value!.TotalCount);
    }

    private static Task<Result<PagedResponse<CustomerListItemResponse>>> Query(
        Spinner.Api.Database.AppDbContext dbContext,
        GetCustomerListQuery query) =>
        new GetCustomerListHandler(dbContext).Handle(query, CancellationToken.None);
}
