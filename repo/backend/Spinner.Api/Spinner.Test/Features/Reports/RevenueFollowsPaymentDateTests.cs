using Microsoft.EntityFrameworkCore;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Reports.GetDailySalesReport;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Reports;

/// <summary>
/// Revenue used to be keyed on the order's preferred date, which the owner can
/// reschedule. That meant the takings for a day already reported could change
/// afterwards, and a single payment could appear on two different days. It also
/// disagreed with the transaction history, which keys on when payment landed.
/// </summary>
public sealed class RevenueFollowsPaymentDateTests
{
    // 09:00 in Manila, which is 01:00 UTC the same day. Chosen deliberately: a naive
    // UTC comparison files this under the previous day.
    private static readonly DateTimeOffset PaidAt =
        new(2026, 8, 4, 9, 0, 0, TimeSpan.FromHours(8));

    private static readonly DateOnly PaidOn = new(2026, 8, 4);
    private static readonly DateOnly RescheduledTo = new(2026, 8, 9);

    [Fact]
    public async Task Should_Keep_Revenue_On_The_Day_It_Was_Paid_After_A_Reschedule()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var order = await CreatePaidOrderAsync(dbContext, PaidOn);

        var amount = order.EstimatedTotalAmount;
        Assert.True(amount > 0m);

        // The owner moves the job to a later day. The money already arrived.
        Assert.True(order.Reschedule(RescheduledTo, "08:00-10:00", PaidAt).IsSuccess);
        await dbContext.SaveChangesAsync();

        var paidDay = await Report(dbContext, PaidOn);
        var movedDay = await Report(dbContext, RescheduledTo);

        Assert.Equal(amount, paidDay.GrossSales);
        Assert.Equal(0m, movedDay.GrossSales);
    }

    [Fact]
    public async Task Should_Not_Report_The_Same_Payment_On_Two_Days()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var order = await CreatePaidOrderAsync(dbContext, PaidOn);
        var amount = order.EstimatedTotalAmount;

        Assert.True(order.Reschedule(RescheduledTo, "08:00-10:00", PaidAt).IsSuccess);
        await dbContext.SaveChangesAsync();

        var total = (await Report(dbContext, PaidOn)).GrossSales
            + (await Report(dbContext, RescheduledTo)).GrossSales;

        Assert.Equal(amount, total);
    }

    [Fact]
    public async Task Should_Count_A_Payment_Taken_Early_In_The_Local_Morning_On_That_Local_Day()
    {
        await using var dbContext = AppDbContextFactory.Create();

        // 00:30 on the 4th in Manila is 16:30Z on the 3rd. Reported by UTC it lands
        // on the wrong day entirely.
        var justAfterMidnight = new DateTimeOffset(2026, 8, 4, 0, 30, 0, TimeSpan.FromHours(8));
        var order = await CreatePaidOrderAsync(dbContext, PaidOn, justAfterMidnight);

        var report = await Report(dbContext, PaidOn);

        Assert.Equal(order.EstimatedTotalAmount, report.GrossSales);
    }

    [Fact]
    public async Task Should_Not_Count_A_Rejected_Order_As_Takings()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var order = await CreatePaidOrderAsync(dbContext, PaidOn);

        // Reject() refuses a paid order, so this reproduces the state an older
        // rejection could leave behind: paid, but turned down.
        dbContext.Entry(order).Property(nameof(LaundryOrder.Status)).CurrentValue =
            OrderStatus.Rejected;
        await dbContext.SaveChangesAsync();

        var report = await Report(dbContext, PaidOn);

        Assert.Equal(0m, report.GrossSales);
    }

    private static async Task<LaundryOrder> CreatePaidOrderAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        DateOnly preferredDate,
        DateTimeOffset? paidAt = null)
    {
        await BookingTestData.CreateBookingAsync(dbContext);
        var order = await dbContext.LaundryOrders.FirstAsync();

        // Set directly rather than through Reschedule, so the tests below can use
        // Reschedule to represent the owner actually moving the job.
        dbContext.Entry(order).Property(nameof(LaundryOrder.PreferredDate)).CurrentValue =
            preferredDate;

        Assert.True(order.Confirm(paidAt ?? PaidAt).IsSuccess);
        Assert.True(order.ConfirmCodPayment("RCPT-TEST", paidAt ?? PaidAt).IsSuccess);
        await dbContext.SaveChangesAsync();

        return order;
    }

    private static async Task<DailySalesReportResponse> Report(
        Spinner.Api.Database.AppDbContext dbContext,
        DateOnly date)
    {
        var result = await new GetDailySalesReportHandler(dbContext, new TestBusinessClock())
            .Handle(new GetDailySalesReportQuery(date), CancellationToken.None);

        Assert.True(result.IsSuccess);
        return result.Value!;
    }
}
