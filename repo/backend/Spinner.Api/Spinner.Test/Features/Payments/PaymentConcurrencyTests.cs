using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Payments;
using Spinner.Api.Features.Payments.ConfirmCodPayment;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Payments;

/// <summary>
/// The domain refuses to settle an order twice, but that check only holds inside one
/// request. Two staff members confirming the same cash payment at the same moment
/// both read the order as unpaid, both passed, and both queued the customer a
/// receipt while only one receipt code survived.
/// </summary>
public sealed class PaymentConcurrencyTests
{
    [Fact]
    public async Task Should_Only_Let_One_Of_Two_Simultaneous_Confirmations_Succeed()
    {
        var (first, second) = AppDbContextFactory.CreatePair();
        await using var firstContext = first;
        await using var secondContext = second;

        var orderId = await CreateConfirmedOrderAsync(firstContext);

        // The second worker must read the order *before* the first one saves, which is
        // the whole situation the guard exists for. Calling the handlers one after the
        // other would not reproduce it: the second would simply read an order that was
        // already paid and be refused by the ordinary domain rule.
        await PreloadAsync(secondContext, orderId);

        var firstResult = await Confirm(firstContext, orderId);
        var secondResult = await Confirm(secondContext, orderId);

        Assert.True(firstResult.IsSuccess);
        Assert.False(secondResult.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, secondResult.Status);
    }

    [Fact]
    public async Task Should_Not_Let_The_Losing_Confirmation_Overwrite_The_Receipt()
    {
        var (first, second) = AppDbContextFactory.CreatePair();
        await using var firstContext = first;
        await using var secondContext = second;

        var orderId = await CreateConfirmedOrderAsync(firstContext);
        await PreloadAsync(secondContext, orderId);

        var winner = await Confirm(firstContext, orderId);
        Assert.True(winner.IsSuccess);

        var receiptAfterFirst = (await firstContext.LaundryOrders.AsNoTracking().SingleAsync())
            .ReceiptCode;

        await Confirm(secondContext, orderId);

        // The receipt code the customer was given must be the one that stays on the
        // order. Previously the second write won, so the stored code no longer matched
        // the receipt already sent out.
        var order = await firstContext.LaundryOrders.AsNoTracking().SingleAsync();

        Assert.Equal(PaymentStatus.Paid, order.PaymentStatus);
        Assert.Equal(receiptAfterFirst, order.ReceiptCode);
    }

    // Not asserted here: that the losing request queues no receipt notification. That
    // depends on the failed SaveChanges rolling back everything in the same
    // transaction, which is true on PostgreSQL but not on the in-memory provider these
    // tests run against. Asserting it would only be testing the provider.

    [Fact]
    public async Task Should_Still_Refuse_A_Second_Confirmation_Made_Later()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateConfirmedOrderAsync(dbContext);

        Assert.True((await Confirm(dbContext, orderId)).IsSuccess);

        // The plain double-confirm, which the domain rule has always covered.
        var again = await Confirm(dbContext, orderId);

        Assert.False(again.IsSuccess);
    }

    private static async Task<Guid> CreateConfirmedOrderAsync(
        Spinner.Api.Database.AppDbContext dbContext)
    {
        await BookingTestData.CreateBookingAsync(dbContext);
        var order = await dbContext.LaundryOrders.FirstAsync();
        Assert.True(order.Confirm(DateTimeOffset.UtcNow).IsSuccess);
        await dbContext.SaveChangesAsync();

        return order.Id;
    }

    /// <summary>
    /// Reads the order into this context's change tracker, standing in for a request
    /// that has already loaded the order and is about to save.
    /// </summary>
    private static async Task PreloadAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        Guid orderId) =>
        await dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstAsync(order => order.Id == orderId);

    private static Task<Result<PaymentConfirmationResponse>> Confirm(
        Spinner.Api.Database.AppDbContext dbContext,
        Guid orderId) =>
        new ConfirmCodPaymentHandler(dbContext)
            .Handle(new ConfirmCodPaymentCommand(orderId), CancellationToken.None);
}
