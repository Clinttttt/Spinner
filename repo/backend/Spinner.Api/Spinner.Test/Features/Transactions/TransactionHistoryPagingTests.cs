using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Transactions;
using Spinner.Api.Features.Transactions;
using Spinner.Api.Features.Transactions.GetTransactionHistory;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Transactions;

/// <summary>
/// History is now counted, sorted and paged by the database. It used to read every
/// financial transaction and every paid order into memory first, so returning twenty
/// rows meant loading the shop's whole trading history — on every keystroke of the
/// search box.
/// </summary>
public sealed class TransactionHistoryPagingTests
{
    private static readonly DateTimeOffset Morning =
        new(2026, 8, 4, 9, 0, 0, TimeSpan.FromHours(8));

    [Fact]
    public async Task Should_Report_The_Total_Across_Both_Sources()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await AddManualAsync(dbContext, 100m, Morning);
        await AddManualAsync(dbContext, 200m, Morning.AddHours(1));
        await AddPaidOrderAsync(dbContext, Morning.AddHours(2));

        var result = await Query(dbContext, new GetTransactionHistoryQuery(null, null, null, null, TransactionSort.Latest, 1, 2));

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value!.TotalCount);
        Assert.Equal(2, result.Value.Items.Count);
    }

    [Fact]
    public async Task Should_Walk_Pages_Without_Repeating_Or_Losing_A_Row()
    {
        await using var dbContext = AppDbContextFactory.Create();
        for (var i = 0; i < 7; i++)
            await AddManualAsync(dbContext, 100m + i, Morning.AddMinutes(i));

        var seen = new List<Guid>();
        for (var page = 1; page <= 4; page++)
        {
            var result = await Query(
                dbContext,
                new GetTransactionHistoryQuery(null, null, null, null, TransactionSort.Latest, page, 2));

            seen.AddRange(result.Value!.Items.Select(item => item.Id));
        }

        // Paging a union without a total order can show the same row twice and skip
        // another, which is why the sort is tie-broken by id.
        Assert.Equal(7, seen.Count);
        Assert.Equal(7, seen.Distinct().Count());
    }

    [Fact]
    public async Task Should_Keep_A_Payment_Taken_Early_In_The_Local_Morning_On_That_Local_Day()
    {
        await using var dbContext = AppDbContextFactory.Create();

        // 00:30 on the 4th in Manila is 16:30Z on the 3rd. Filtering on the UTC date
        // filed the whole early shift under the previous day.
        await AddManualAsync(dbContext, 500m, new DateTimeOffset(2026, 8, 4, 0, 30, 0, TimeSpan.FromHours(8)));

        var onTheDay = await Query(
            dbContext,
            new GetTransactionHistoryQuery(null, null, new DateOnly(2026, 8, 4), new DateOnly(2026, 8, 4), TransactionSort.Latest, 1, 20));

        var dayBefore = await Query(
            dbContext,
            new GetTransactionHistoryQuery(null, null, new DateOnly(2026, 8, 3), new DateOnly(2026, 8, 3), TransactionSort.Latest, 1, 20));

        Assert.Equal(1, onTheDay.Value!.TotalCount);
        Assert.Equal(0, dayBefore.Value!.TotalCount);
    }

    [Fact]
    public async Task Should_Exclude_A_Payment_Taken_Just_After_Midnight_The_Next_Day()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await AddManualAsync(dbContext, 500m, new DateTimeOffset(2026, 8, 5, 0, 1, 0, TimeSpan.FromHours(8)));

        var result = await Query(
            dbContext,
            new GetTransactionHistoryQuery(null, null, new DateOnly(2026, 8, 4), new DateOnly(2026, 8, 4), TransactionSort.Latest, 1, 20));

        // The upper bound is exclusive at the start of the next day, so one minute past
        // midnight belongs to the fifth.
        Assert.Equal(0, result.Value!.TotalCount);
    }

    [Fact]
    public async Task Should_Filter_By_Kind()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await AddManualAsync(dbContext, 100m, Morning);
        await AddPaidOrderAsync(dbContext, Morning);

        var result = await Query(
            dbContext,
            new GetTransactionHistoryQuery(null, TransactionKind.BookingSale, null, null, TransactionSort.Latest, 1, 20));

        Assert.Equal(1, result.Value!.TotalCount);
        Assert.Equal(TransactionKind.BookingSale, result.Value.Items[0].Kind);
    }

    [Fact]
    public async Task Should_Find_A_Row_By_Its_Order_Code()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await AddPaidOrderAsync(dbContext, Morning);
        var order = await dbContext.LaundryOrders.AsNoTracking().FirstAsync();

        var result = await Query(
            dbContext,
            new GetTransactionHistoryQuery(order.OrderCode, null, null, null, TransactionSort.Latest, 1, 20));

        Assert.Equal(1, result.Value!.TotalCount);
    }

    [Fact]
    public async Task Should_Find_A_Row_By_Its_Note()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await AddManualAsync(dbContext, 250m, Morning, "Detergent restock");

        var result = await Query(
            dbContext,
            new GetTransactionHistoryQuery("detergent", null, null, null, TransactionSort.Latest, 1, 20));

        Assert.Equal(1, result.Value!.TotalCount);
    }

    [Fact]
    public async Task Should_Find_A_Row_By_Its_Amount()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await AddManualAsync(dbContext, 250m, Morning, "Restock");
        await AddManualAsync(dbContext, 999m, Morning, "Something else");

        var result = await Query(
            dbContext,
            new GetTransactionHistoryQuery("250", null, null, null, TransactionSort.Latest, 1, 20));

        Assert.Equal(1, result.Value!.TotalCount);
        Assert.Equal(250m, result.Value.Items[0].Amount);
    }

    [Fact]
    public async Task Should_Sort_By_Amount_When_Asked()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await AddManualAsync(dbContext, 100m, Morning);
        await AddManualAsync(dbContext, 900m, Morning.AddHours(1));
        await AddManualAsync(dbContext, 500m, Morning.AddHours(2));

        var highest = await Query(
            dbContext,
            new GetTransactionHistoryQuery(null, null, null, null, TransactionSort.Highest, 1, 20));

        Assert.Equal(
            new[] { 900m, 500m, 100m },
            highest.Value!.Items.Select(item => item.Amount).ToArray());
    }

    [Fact]
    public async Task Should_Summarise_Every_Service_On_A_Multi_Service_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await AddPaidOrderAsync(dbContext, Morning);

        var result = await Query(dbContext, new GetTransactionHistoryQuery(null, null, null, null, TransactionSort.Latest, 1, 20));

        // The service summary is not stored, so it is built for the returned page
        // rather than by loading every order's items up front.
        Assert.False(string.IsNullOrWhiteSpace(result.Value!.Items[0].ServiceLabel));
    }

    private static async Task AddManualAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        decimal amount,
        DateTimeOffset occurredAt,
        string note = "Manual entry")
    {
        dbContext.FinancialTransactions.Add(
            new FinancialTransaction(TransactionKind.ManualIncome, amount, note, occurredAt, occurredAt));

        await dbContext.SaveChangesAsync();
    }

    private static async Task AddPaidOrderAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        DateTimeOffset paidAt)
    {
        await BookingTestData.CreateBookingAsync(dbContext);
        var order = await dbContext.LaundryOrders
            .OrderByDescending(item => item.CreatedAt)
            .FirstAsync();

        Assert.True(order.Confirm(paidAt).IsSuccess);
        Assert.True(order.ConfirmCodPayment("RCPT-TEST", paidAt).IsSuccess);
        await dbContext.SaveChangesAsync();
    }

    private static Task<Result<PagedResponse<TransactionHistoryResponse>>> Query(
        Spinner.Api.Database.AppDbContext dbContext,
        GetTransactionHistoryQuery query) =>
        new GetTransactionHistoryHandler(dbContext, new TestBusinessClock(Morning))
            .Handle(query, CancellationToken.None);
}
