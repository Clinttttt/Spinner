using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Reports.ExportOrderHistory;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Reports;

/// <summary>
/// The export used to read the whole orders table with no bound, buffer the entire
/// CSV, and return it inside a JSON payload. That gets slower and larger every month
/// the shop trades.
/// </summary>
public sealed class OrderHistoryExportBoundsTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 8, 4, 9, 0, 0, TimeSpan.FromHours(8));

    private static readonly DateOnly Today = new(2026, 8, 4);

    [Fact]
    public async Task Should_Refuse_A_Range_Wider_Than_A_Year()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await Export(dbContext, Today.AddDays(-800), Today);

        // Refused rather than silently truncated: an accounting export that drops rows
        // without saying so is worse than one that asks to be narrowed.
        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Validation, result.Status);
        Assert.Contains("shorter periods", result.Error.Message);
    }

    [Fact]
    public async Task Should_Accept_A_Range_Exactly_At_The_Limit()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var from = Today.AddDays(-(ExportOrderHistoryHandler.MaximumDays - 1));
        var result = await Export(dbContext, from, Today);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Should_Refuse_A_Backwards_Range()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await Export(dbContext, Today, Today.AddDays(-7));

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Should_Default_To_A_Recent_Window_Rather_Than_Everything()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await SeedOrderAsync(dbContext, Today);
        await SeedOrderAsync(dbContext, Today.AddDays(-400));

        var result = await Export(dbContext, null, null);

        // The old code with no dates read the entire table. The recent order is
        // included and the ancient one is not.
        Assert.True(result.IsSuccess);
        Assert.Equal(1, result.Value!.RowCount);
        Assert.False(result.Value.IsTruncated);
    }

    [Fact]
    public async Task Should_Name_The_File_After_The_Range_It_Covers()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await Export(dbContext, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 31));

        Assert.True(result.IsSuccess);
        Assert.Equal("order-history-20260701-20260731.csv", result.Value!.FileName);
    }

    [Fact]
    public async Task Should_Stop_A_Spreadsheet_Treating_A_Name_As_A_Formula()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await SeedOrderAsync(dbContext, Today, contactName: "=1+1");

        var result = await Export(dbContext, Today.AddDays(-1), Today);

        // A cell starting with = is executed by spreadsheet software on open, so a
        // customer name is an injection vector into the owner's own machine.
        Assert.True(result.IsSuccess);
        Assert.Contains("'=1+1", result.Value!.Content);
    }

    [Fact]
    public async Task Should_Quote_A_Name_Containing_A_Comma()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await SeedOrderAsync(dbContext, Today, contactName: "Santos, Maria");

        var result = await Export(dbContext, Today.AddDays(-1), Today);

        Assert.True(result.IsSuccess);
        Assert.Contains("\"Santos, Maria\"", result.Value!.Content);
    }

    private static async Task SeedOrderAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        DateOnly preferredDate,
        string contactName = "Maria Santos")
    {
        await BookingTestData.CreateBookingAsync(dbContext, fullName: contactName);

        var order = await dbContext.LaundryOrders
            .OrderByDescending(item => item.CreatedAt)
            .FirstAsync();

        dbContext.Entry(order).Property(nameof(LaundryOrder.PreferredDate)).CurrentValue =
            preferredDate;
        await dbContext.SaveChangesAsync();
    }

    private static Task<Result<OrderHistoryExportResponse>> Export(
        Spinner.Api.Database.AppDbContext dbContext,
        DateOnly? from,
        DateOnly? to) =>
        new ExportOrderHistoryHandler(dbContext, new TestBusinessClock(Now))
            .Handle(new ExportOrderHistoryQuery(null, from, to), CancellationToken.None);
}
