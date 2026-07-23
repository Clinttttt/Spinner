using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Transactions;
using Spinner.Api.Features.Transactions;
using Spinner.Api.Features.Transactions.CreateManualTransaction;
using Spinner.Api.Features.Transactions.GetTransactionHistory;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Transactions;

public sealed class TransactionHandlerTests
{
    [Fact]
    public async Task CreateManualTransaction_Should_Persist_Income()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var occurredAt = DateTimeOffset.UtcNow.AddMinutes(-5);

        var result = await new CreateManualTransactionHandler(dbContext).Handle(
            new CreateManualTransactionCommand(
                TransactionKind.ManualIncome,
                250m,
                "Walk-in cash adjustment",
                occurredAt),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(TransactionKind.ManualIncome, result.Value!.Kind);
        Assert.Equal(250m, result.Value.Amount);
        Assert.Single(dbContext.FinancialTransactions);
        Assert.Single(dbContext.ActivityLogEntries);
    }

    [Fact]
    public async Task GetTransactionHistory_Should_Combine_Manual_Entries_And_Paid_Booking_Sales()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var booking = await BookingTestData.CreateBookingAsync(dbContext);
        Assert.True(booking.IsSuccess);
        var order = dbContext.LaundryOrders.Single();
        order.Confirm(DateTimeOffset.UtcNow);
        order.ConfirmCodPayment("DR-TRANSACTION-TEST", DateTimeOffset.UtcNow);
        dbContext.FinancialTransactions.Add(new FinancialTransaction(
            TransactionKind.ManualDeduction,
            120m,
            "Detergent restock",
            DateTimeOffset.UtcNow,
            DateTimeOffset.UtcNow));
        await dbContext.SaveChangesAsync();

        var result = await new GetTransactionHistoryHandler(dbContext).Handle(
            new GetTransactionHistoryQuery(null, null, null, null, TransactionSort.Latest),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.TotalCount);
        Assert.Contains(result.Value.Items, item => item.Kind == TransactionKind.BookingSale);
        Assert.Contains(result.Value.Items, item => item.Kind == TransactionKind.ManualDeduction);
    }
}
