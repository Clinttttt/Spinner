using Microsoft.EntityFrameworkCore;
using Spinner.Api.Domain.Transactions;
using Spinner.Api.Features.Customers.GetCustomerList;
using Spinner.Api.Features.Reports.ExportOrderHistory;
using Spinner.Api.Features.Transactions;
using Spinner.Api.Features.Transactions.GetTransactionHistory;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Database;

/// <summary>
/// Proves the paged queries can actually be turned into PostgreSQL.
/// </summary>
/// <remarks>
/// Written after two of them passed every in-memory test and then failed on the first
/// real request. The in-memory provider executes LINQ directly, so it accepts shapes
/// that have no SQL equivalent: ordering by a member of a record built through its
/// positional constructor, and filtering a union on a value produced by unwrapping a
/// nullable. Nothing here connects to a database — the query is only asked to render
/// itself, which is the step that used to blow up.
/// </remarks>
public sealed class QueryTranslationTests
{
    private static readonly DateOnly From = new(2026, 7, 1);
    private static readonly DateOnly To = new(2026, 7, 31);

    [Theory]
    [InlineData(null)]
    [InlineData("maria")]
    public void Should_Translate_The_Customer_List(string? search)
    {
        using var dbContext = PostgresQueryFactory.Create();

        // Through the handler, not a hand-written copy of it. Writing the query out
        // again in the test is what let the original failure through: the test version
        // happened to avoid the shape that broke.
        var sql = new GetCustomerListHandler(dbContext)
            .BuildQueryForTranslationCheck(new GetCustomerListQuery(search, 1, 20));

        Assert.Contains("SELECT", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("LIMIT", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(null, null, null, null)]
    [InlineData("wash", null, null, null)]
    [InlineData("230", null, null, null)]
    [InlineData(null, TransactionKind.BookingSale, null, null)]
    [InlineData(null, null, TransactionDirection.In, null)]
    [InlineData(null, null, TransactionDirection.Out, null)]
    [InlineData(null, null, null, TransactionSort.Oldest)]
    [InlineData(null, null, null, TransactionSort.Highest)]
    [InlineData(null, null, null, TransactionSort.Lowest)]
    [InlineData("ES-", TransactionKind.BookingSale, TransactionDirection.In, TransactionSort.Highest)]
    public void Should_Translate_Transaction_History(
        string? search,
        TransactionKind? kind,
        TransactionDirection? direction,
        TransactionSort? sort)
    {
        using var dbContext = PostgresQueryFactory.Create();

        var handler = new GetTransactionHistoryHandler(dbContext, new TestBusinessClock());

        // Every combination, including the date range, which is the one that failed.
        var sql = handler.BuildQueryForTranslationCheck(
            new GetTransactionHistoryQuery(
                search,
                kind,
                From,
                To,
                sort ?? TransactionSort.Latest,
                1,
                20,
                direction));

        Assert.Contains("SELECT", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Should_Translate_The_Order_History_Export()
    {
        using var dbContext = PostgresQueryFactory.Create();

        var sql = dbContext.LaundryOrders
            .AsNoTracking()
            .Where(order => order.PreferredDate >= From && order.PreferredDate <= To)
            .OrderByDescending(order => order.PreferredDate)
            .ThenByDescending(order => order.CreatedAt)
            .Take(ExportOrderHistoryHandler.MaximumRows + 1)
            .Select(order => new
            {
                order.OrderCode,
                order.ContactName,
                order.Customer.MobileNumber,
            })
            .ToQueryString();

        Assert.Contains("SELECT", sql, StringComparison.OrdinalIgnoreCase);
    }
}
