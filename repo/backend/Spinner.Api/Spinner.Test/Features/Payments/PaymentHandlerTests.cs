using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.Payments;
using Spinner.Api.Features.Payments.CalculateOrderTotal;
using Spinner.Api.Features.Payments.ConfirmCodPayment;
using Spinner.Api.Features.Payments.CreateOnlinePaymentLink;
using Spinner.Api.Features.Payments.HandleOnlinePaymentWebhook;
using Spinner.Api.Integrations.OnlinePayments;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Payments;

public sealed class PaymentHandlerTests
{
    private const string WebhookSecret = "test-secret";

    [Fact]
    public async Task CalculateOrderTotal_Should_Return_AutoCalculated_Total()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);

        var result = await new CalculateOrderTotalHandler(dbContext)
            .Handle(new CalculateOrderTotalQuery(created.Value!.OrderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(200m, result.Value!.TotalAmount);
        Assert.Equal(200m, result.Value.AmountToCollect);
        Assert.Equal(PaymentStatus.Unpaid, result.Value.PaymentStatus);
    }

    [Fact]
    public async Task ConfirmCodPayment_Should_Mark_Paid_Generate_Receipt_And_Queue_Notifications()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);
        dbContext.NotificationOutboxMessages.RemoveRange(dbContext.NotificationOutboxMessages);
        await dbContext.SaveChangesAsync();

        var result = await new ConfirmCodPaymentHandler(dbContext)
            .Handle(new ConfirmCodPaymentCommand(created.Value.OrderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(PaymentStatus.Paid, result.Value!.PaymentStatus);
        Assert.StartsWith("DR-", result.Value.ReceiptCode);
        Assert.NotNull(result.Value.PaidAt);

        var message = await dbContext.NotificationOutboxMessages.SingleAsync();
        Assert.Equal(created.Value.OrderId, message.OrderId);
        Assert.Equal(NotificationChannel.Sms, message.Channel);
        Assert.Contains("Digital Receipt", message.Message);
    }

    [Fact]
    public async Task ConfirmCodPayment_Should_Return_Conflict_For_QrCodeOnlinePayment()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(
            dbContext,
            paymentMethod: PaymentMethod.QrCodeOnlinePayment);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);

        var result = await new ConfirmCodPaymentHandler(dbContext)
            .Handle(new ConfirmCodPaymentCommand(created.Value.OrderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);

        var order = await dbContext.LaundryOrders.SingleAsync(order => order.Id == created.Value.OrderId);
        Assert.Equal(PaymentStatus.Unpaid, order.PaymentStatus);
        Assert.Null(order.ReceiptCode);
    }

    [Fact]
    public async Task ConfirmCodPayment_Should_Return_Conflict_When_Already_Paid()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);
        await new ConfirmCodPaymentHandler(dbContext)
            .Handle(new ConfirmCodPaymentCommand(created.Value.OrderId), CancellationToken.None);

        var result = await new ConfirmCodPaymentHandler(dbContext)
            .Handle(new ConfirmCodPaymentCommand(created.Value.OrderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task ConfirmCodPayment_Should_Return_Conflict_When_Order_Is_Not_Active()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);

        var result = await new ConfirmCodPaymentHandler(dbContext)
            .Handle(new ConfirmCodPaymentCommand(created.Value!.OrderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task CreateOnlinePaymentLink_Should_Create_Link_For_Active_Qr_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(
            dbContext,
            paymentMethod: PaymentMethod.QrCodeOnlinePayment);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);

        var result = await CreateOnlinePaymentLinkHandler(dbContext)
            .Handle(new CreateOnlinePaymentLinkCommand(created.Value.OrderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.StartsWith("PAY-", result.Value!.PaymentReference);
        Assert.Equal($"/pay/{result.Value.PaymentReference}", result.Value.CheckoutUrl);
        Assert.Equal(200m, result.Value.Amount);

        var order = await dbContext.LaundryOrders.SingleAsync(order => order.Id == created.Value.OrderId);
        Assert.Equal(result.Value.PaymentReference, order.OnlinePaymentReference);
        Assert.Equal(result.Value.CheckoutUrl, order.OnlinePaymentCheckoutUrl);
    }

    [Fact]
    public async Task CreateOnlinePaymentLink_Should_Return_Same_Link_When_Already_Created()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(
            dbContext,
            paymentMethod: PaymentMethod.QrCodeOnlinePayment);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);
        var handler = CreateOnlinePaymentLinkHandler(dbContext);

        var first = await handler.Handle(new CreateOnlinePaymentLinkCommand(created.Value.OrderId), CancellationToken.None);
        var second = await handler.Handle(new CreateOnlinePaymentLinkCommand(created.Value.OrderId), CancellationToken.None);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value!.PaymentReference, second.Value!.PaymentReference);
        Assert.Equal(first.Value.CheckoutUrl, second.Value.CheckoutUrl);
    }

    [Fact]
    public async Task CreateOnlinePaymentLink_Should_Return_Conflict_For_Cod_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);

        var result = await CreateOnlinePaymentLinkHandler(dbContext)
            .Handle(new CreateOnlinePaymentLinkCommand(created.Value.OrderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task HandleOnlinePaymentWebhook_Should_Mark_Qr_Order_Paid_And_Queue_Receipt()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await CreateActiveQrOrderWithPaymentLinkAsync(dbContext);
        dbContext.NotificationOutboxMessages.RemoveRange(dbContext.NotificationOutboxMessages);
        await dbContext.SaveChangesAsync();
        var order = await dbContext.LaundryOrders.SingleAsync(order => order.Id == created.OrderId);
        var signature = OnlinePaymentSignatureVerifier.Sign(
            order.OnlinePaymentReference!,
            order.EstimatedTotalAmount,
            "paid",
            WebhookSecret);

        var result = await CreateWebhookHandler(dbContext)
            .Handle(
                new HandleOnlinePaymentWebhookCommand(
                    order.OnlinePaymentReference!,
                    order.EstimatedTotalAmount,
                    "paid",
                    signature),
                CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(PaymentStatus.Paid, result.Value!.PaymentStatus);
        Assert.StartsWith("DR-", result.Value.ReceiptCode);

        var saved = await dbContext.LaundryOrders.SingleAsync(item => item.Id == created.OrderId);
        Assert.Equal(PaymentStatus.Paid, saved.PaymentStatus);
        Assert.NotNull(saved.PaidAt);
        Assert.StartsWith("DR-", saved.ReceiptCode);

        var notification = await dbContext.NotificationOutboxMessages.SingleAsync();
        Assert.Equal(NotificationChannel.Sms, notification.Channel);
        Assert.Contains("Digital Receipt", notification.Message);
    }

    [Fact]
    public async Task HandleOnlinePaymentWebhook_Should_Refuse_A_Legacy_Webhook_Call_When_It_Is_Closed()
    {
        // PayMongo is the gateway and posts to the paymongo/webhook route with its own
        // signature header, so it cannot reach this one. That left a second route able to
        // mark any QR order paid on nothing but a shared secret held in configuration. It is
        // closed unless deliberately switched on, and a correct signature must not open it.
        await using var dbContext = AppDbContextFactory.Create();
        var created = await CreateActiveQrOrderWithPaymentLinkAsync(dbContext);
        var order = await dbContext.LaundryOrders.SingleAsync(item => item.Id == created.OrderId);
        var signature = OnlinePaymentSignatureVerifier.Sign(
            order.OnlinePaymentReference!,
            order.EstimatedTotalAmount,
            "paid",
            WebhookSecret);

        var result = await CreateWebhookHandler(dbContext, legacyWebhookEnabled: false)
            .Handle(
                new HandleOnlinePaymentWebhookCommand(
                    order.OnlinePaymentReference!,
                    order.EstimatedTotalAmount,
                    "paid",
                    signature),
                CancellationToken.None);

        Assert.False(result.IsSuccess);

        // The order must be untouched: no payment, no receipt.
        var saved = await dbContext.LaundryOrders.SingleAsync(item => item.Id == created.OrderId);
        Assert.NotEqual(PaymentStatus.Paid, saved.PaymentStatus);
        Assert.Null(saved.PaidAt);
    }

    [Fact]
    public async Task HandleOnlinePaymentWebhook_Should_Return_Unauthorized_For_Invalid_Signature()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await CreateActiveQrOrderWithPaymentLinkAsync(dbContext);
        var order = await dbContext.LaundryOrders.SingleAsync(order => order.Id == created.OrderId);

        var result = await CreateWebhookHandler(dbContext)
            .Handle(
                new HandleOnlinePaymentWebhookCommand(
                    order.OnlinePaymentReference!,
                    order.EstimatedTotalAmount,
                    "paid",
                    "bad-signature"),
                CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Unauthorized, result.Status);
    }

    [Fact]
    public async Task HandleOnlinePaymentWebhook_Should_Return_Conflict_When_Amount_Does_Not_Match()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await CreateActiveQrOrderWithPaymentLinkAsync(dbContext);
        var order = await dbContext.LaundryOrders.SingleAsync(order => order.Id == created.OrderId);
        var wrongAmount = order.EstimatedTotalAmount + 1m;
        var signature = OnlinePaymentSignatureVerifier.Sign(
            order.OnlinePaymentReference!,
            wrongAmount,
            "paid",
            WebhookSecret);

        var result = await CreateWebhookHandler(dbContext)
            .Handle(
                new HandleOnlinePaymentWebhookCommand(
                    order.OnlinePaymentReference!,
                    wrongAmount,
                    "paid",
                    signature),
                CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);

        var saved = await dbContext.LaundryOrders.SingleAsync(item => item.Id == created.OrderId);
        Assert.Equal(PaymentStatus.Unpaid, saved.PaymentStatus);
        Assert.Null(saved.ReceiptCode);
    }

    [Fact]
    public async Task HandleOnlinePaymentWebhook_Should_Be_Idempotent_For_Duplicate_Paid_Event()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await CreateActiveQrOrderWithPaymentLinkAsync(dbContext);
        dbContext.NotificationOutboxMessages.RemoveRange(dbContext.NotificationOutboxMessages);
        await dbContext.SaveChangesAsync();
        var order = await dbContext.LaundryOrders.SingleAsync(order => order.Id == created.OrderId);
        var signature = OnlinePaymentSignatureVerifier.Sign(
            order.OnlinePaymentReference!,
            order.EstimatedTotalAmount,
            "paid",
            WebhookSecret);
        var handler = CreateWebhookHandler(dbContext);

        var first = await handler.Handle(
            new HandleOnlinePaymentWebhookCommand(order.OnlinePaymentReference!, order.EstimatedTotalAmount, "paid", signature),
            CancellationToken.None);
        var second = await handler.Handle(
            new HandleOnlinePaymentWebhookCommand(order.OnlinePaymentReference!, order.EstimatedTotalAmount, "paid", signature),
            CancellationToken.None);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value!.ReceiptCode, second.Value!.ReceiptCode);
        Assert.Equal(1, await dbContext.NotificationOutboxMessages.CountAsync());
    }

    private static CreateOnlinePaymentLinkHandler CreateOnlinePaymentLinkHandler(Spinner.Api.Database.AppDbContext dbContext)
    {
        return new CreateOnlinePaymentLinkHandler(
            dbContext,
            Options.Create(new OnlinePaymentOptions
            {
                PublicPaymentBaseUrl = "/pay",
                WebhookSecret = WebhookSecret
            }));
    }

    private static HandleOnlinePaymentWebhookHandler CreateWebhookHandler(
        Spinner.Api.Database.AppDbContext dbContext,
        bool legacyWebhookEnabled = true)
    {
        // The legacy webhook is closed in production, so these tests open it deliberately.
        // Should_Refuse_A_Legacy_Webhook_Call_When_It_Is_Closed covers the default.
        var options = Options.Create(new OnlinePaymentOptions
        {
            EnableLegacyWebhook = legacyWebhookEnabled,
            PublicPaymentBaseUrl = "/pay",
            WebhookSecret = WebhookSecret
        });

        return new HandleOnlinePaymentWebhookHandler(
            dbContext,
            new OnlinePaymentSignatureVerifier(options),
            options,
            NullLogger<HandleOnlinePaymentWebhookHandler>.Instance);
    }

    private static async Task<OnlinePaymentLinkResponse> CreateActiveQrOrderWithPaymentLinkAsync(
        Spinner.Api.Database.AppDbContext dbContext)
    {
        var created = await BookingTestData.CreateBookingAsync(
            dbContext,
            paymentMethod: PaymentMethod.QrCodeOnlinePayment);
        await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(created.Value!.OrderId), CancellationToken.None);

        var link = await CreateOnlinePaymentLinkHandler(dbContext)
            .Handle(new CreateOnlinePaymentLinkCommand(created.Value.OrderId), CancellationToken.None);

        return link.Value!;
    }
}
