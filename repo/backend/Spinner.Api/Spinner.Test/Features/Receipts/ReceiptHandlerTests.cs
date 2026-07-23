using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.Payments.ConfirmCodPayment;
using Spinner.Api.Features.Receipts.CreatePaymentInstructionMessage;
using Spinner.Api.Features.Receipts.GetReceipt;
using Spinner.Api.Features.Receipts.ResendReceipt;
using Spinner.Api.Features.Receipts.SendReceipt;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Receipts;

public sealed class ReceiptHandlerTests
{
    [Fact]
    public async Task GetReceipt_Should_Return_Digital_Receipt_For_Paid_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreatePaidOrderAsync(dbContext);
        var order = await dbContext.LaundryOrders.SingleAsync(order => order.Id == orderId);

        var result = await new GetReceiptHandler(dbContext)
            .Handle(new GetReceiptQuery(order.ReceiptCode!), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Digital Receipt", result.Value!.ReceiptTitle);
        Assert.Equal(order.ReceiptCode, result.Value.ReceiptCode);
        Assert.Equal(PaymentStatus.Paid, result.Value.PaymentStatus);
    }

    [Fact]
    public async Task GetReceipt_Should_Return_NotFound_For_Unknown_Receipt()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await new GetReceiptHandler(dbContext)
            .Handle(new GetReceiptQuery("DR-MISSING"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.NotFound, result.Status);
    }

    [Fact]
    public async Task SendReceipt_Should_Queue_Sms_When_Order_Is_Paid()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreatePaidOrderAsync(dbContext);
        dbContext.NotificationOutboxMessages.RemoveRange(dbContext.NotificationOutboxMessages);
        await dbContext.SaveChangesAsync();

        var result = await new SendReceiptHandler(dbContext)
            .Handle(new SendReceiptCommand(orderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value!.SmsQueued);
        Assert.False(result.Value.EmailQueued);

        var message = await dbContext.NotificationOutboxMessages.SingleAsync();
        Assert.Equal(NotificationChannel.Sms, message.Channel);
        Assert.Contains("Digital Receipt", message.Message);
    }

    [Fact]
    public async Task ResendReceipt_Should_Queue_Sms_When_Order_Is_Paid()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreatePaidOrderAsync(dbContext);
        dbContext.NotificationOutboxMessages.RemoveRange(dbContext.NotificationOutboxMessages);
        await dbContext.SaveChangesAsync();

        var result = await new ResendReceiptHandler(dbContext)
            .Handle(new ResendReceiptCommand(orderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value!.SmsQueued);
        Assert.Equal(1, await dbContext.NotificationOutboxMessages.CountAsync());
    }

    [Fact]
    public async Task SendReceipt_Should_Return_Conflict_When_Order_Is_Unpaid()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);

        var result = await new SendReceiptHandler(dbContext)
            .Handle(new SendReceiptCommand(created.Value.OrderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task CreatePaymentInstructionMessage_Should_Return_Cod_Message_For_Unpaid_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);

        var result = await new CreatePaymentInstructionMessageHandler(dbContext)
            .Handle(new CreatePaymentInstructionMessageQuery(created.Value!.OrderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(200m, result.Value!.AmountToPay);
        Assert.Contains("Please pay on delivery or claim", result.Value.Message);
    }

    [Fact]
    public async Task CreatePaymentInstructionMessage_Should_Return_Conflict_When_Order_Is_Paid()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreatePaidOrderAsync(dbContext);

        var result = await new CreatePaymentInstructionMessageHandler(dbContext)
            .Handle(new CreatePaymentInstructionMessageQuery(orderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    private static async Task<Guid> CreatePaidOrderAsync(Spinner.Api.Database.AppDbContext dbContext)
    {
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);
        var paid = await new ConfirmCodPaymentHandler(dbContext)
            .Handle(new ConfirmCodPaymentCommand(created.Value.OrderId), CancellationToken.None);

        return paid.Value!.OrderId;
    }
}
