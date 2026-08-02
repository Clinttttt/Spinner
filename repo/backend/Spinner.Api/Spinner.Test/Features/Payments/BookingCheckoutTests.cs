using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using DomainBusinessSettings = Spinner.Api.Domain.Business.BusinessSettings;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Payments;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Api.Features.Bookings.GetBookingCheckoutStatus;
using Spinner.Api.Features.Bookings.GetBookings;
using Spinner.Api.Features.Bookings.StartBookingCheckout;
using Spinner.Api.Features.Payments;
using Spinner.Api.Features.Payments.HandlePayMongoWebhook;
using Spinner.Api.Integrations.OnlinePayments;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Payments;

/// <summary>
/// QR bookings are paid before they exist, so the order must appear exactly once
/// and only after the provider confirms the money.
/// </summary>
public sealed class BookingCheckoutTests
{
    private const string WebhookSecret = "whsk_test_secret_value_for_unit_tests";

    [Fact]
    public async Task Should_Not_Create_An_Order_When_Checkout_Only_Starts()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedShop(dbContext, qrEnabled: true);

        var checkout = await StartAsync(dbContext, Booking(service.Id, 2));

        Assert.True(checkout.IsSuccess);
        Assert.StartsWith("PAY-", checkout.Value!.Reference);
        // 2 x 170 + 60 delivery, priced from the shop's list rather than the client.
        Assert.Equal(400m, checkout.Value.Amount);

        // Nothing is on the owner's list, so the shop cannot start unpaid work.
        Assert.Empty(await dbContext.LaundryOrders.ToListAsync());
        var bookings = await new GetBookingsHandler(dbContext)
            .Handle(new GetBookingsQuery(null, null, 1, 20, false), CancellationToken.None);
        Assert.Empty(bookings.Value!.Items);
    }

    [Fact]
    public async Task Should_Price_From_The_Shop_List_Not_The_Request()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedShop(dbContext, qrEnabled: true);

        // The request carries only what was chosen; there is no field for money.
        var checkout = await StartAsync(dbContext, Booking(service.Id, 3));

        // 3 x 170 = 510 plus one delivery fee of 60.
        Assert.Equal(570m, checkout.Value!.Amount);
    }

    [Fact]
    public async Task Should_Create_The_Order_Once_Payment_Is_Confirmed()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedShop(dbContext, qrEnabled: true);
        var checkout = await StartAsync(dbContext, Booking(service.Id, 2));
        var pending = await dbContext.PendingBookings.SingleAsync();

        var result = await DeliverPaidWebhookAsync(dbContext, pending.CheckoutSessionId!, pending.Reference);

        Assert.True(result.IsSuccess);
        Assert.Equal("paid.fulfilled", result.Value!.Outcome);

        var order = await dbContext.LaundryOrders.Include(item => item.ServiceItems).SingleAsync();
        Assert.Equal(PaymentStatus.Paid, order.PaymentStatus);
        Assert.Equal(PaymentMethod.QrCodeOnlinePayment, order.PaymentMethod);
        Assert.Equal(400m, order.EstimatedTotalAmount);
        Assert.Equal(order.OrderCode, result.Value.OrderCode);

        var settled = await dbContext.PendingBookings.SingleAsync();
        Assert.Equal(order.Id, settled.OrderId);
        Assert.Equal(PendingBookingStatus.Paid, settled.Status);
        Assert.Equal(checkout.Value!.Reference, settled.Reference);
    }

    [Fact]
    public async Task Should_Create_Only_One_Order_When_The_Same_Event_Arrives_Twice()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedShop(dbContext, qrEnabled: true);
        await StartAsync(dbContext, Booking(service.Id, 1));
        var pending = await dbContext.PendingBookings.SingleAsync();

        var first = await DeliverPaidWebhookAsync(dbContext, pending.CheckoutSessionId!, pending.Reference);
        var second = await DeliverPaidWebhookAsync(dbContext, pending.CheckoutSessionId!, pending.Reference);

        // A provider retry must be recognised, not charged into a second order.
        Assert.Equal("paid.fulfilled", first.Value!.Outcome);
        Assert.Equal("already.fulfilled", second.Value!.Outcome);
        Assert.Equal(first.Value.OrderCode, second.Value.OrderCode);
        Assert.Single(await dbContext.LaundryOrders.ToListAsync());
    }

    [Fact]
    public async Task Should_Reject_An_Unsigned_Webhook()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedShop(dbContext, qrEnabled: true);
        await StartAsync(dbContext, Booking(service.Id, 1));
        var pending = await dbContext.PendingBookings.SingleAsync();

        var body = PaidEventBody(pending.CheckoutSessionId!, pending.Reference);
        var result = await Webhook(dbContext).Handle(
            new HandlePayMongoWebhookCommand(body, "t=1,te=deadbeef"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Unauthorized, result.Status);
        // Nothing may be created or settled on an unverifiable request.
        Assert.Empty(await dbContext.LaundryOrders.ToListAsync());
        Assert.Equal(PendingBookingStatus.AwaitingPayment,
            (await dbContext.PendingBookings.SingleAsync()).Status);
    }

    [Fact]
    public async Task Should_Acknowledge_Events_For_Other_Integrations()
    {
        await using var dbContext = AppDbContextFactory.Create();
        SeedShop(dbContext, qrEnabled: true);

        // Same PayMongo account, different product. Returning an error would make
        // the provider retry something that is not ours.
        var result = await DeliverPaidWebhookAsync(dbContext, "cs_not_ours", "PAY-not-ours");

        Assert.True(result.IsSuccess);
        Assert.Equal("ignored.unknown", result.Value!.Outcome);
        Assert.Empty(await dbContext.LaundryOrders.ToListAsync());
    }

    [Fact]
    public async Task Should_Return_The_Same_Checkout_When_The_Customer_Submits_Twice()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedShop(dbContext, qrEnabled: true);
        var booking = Booking(service.Id, 2);

        var first = await StartAsync(dbContext, booking);
        var second = await StartAsync(dbContext, booking);

        // Two checkouts would be two payable QR codes for one booking.
        Assert.Equal(first.Value!.Reference, second.Value!.Reference);
        Assert.Equal(first.Value.CheckoutUrl, second.Value.CheckoutUrl);
        Assert.Single(await dbContext.PendingBookings.ToListAsync());
    }

    [Fact]
    public async Task Should_Refuse_A_Checkout_When_Qr_Payment_Is_Switched_Off()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedShop(dbContext, qrEnabled: false);

        var result = await StartAsync(dbContext, Booking(service.Id, 1));

        Assert.False(result.IsSuccess);
        Assert.Empty(await dbContext.PendingBookings.ToListAsync());
    }

    [Fact]
    public async Task Should_Report_Status_For_The_Customers_Return_Page()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedShop(dbContext, qrEnabled: true);
        var checkout = await StartAsync(dbContext, Booking(service.Id, 2));
        var reference = checkout.Value!.Reference;

        var before = await StatusAsync(dbContext, reference);
        Assert.Equal("awaitingPayment", before.Value!.State);
        Assert.Null(before.Value.OrderCode);
        Assert.NotNull(before.Value.CheckoutUrl);

        var pending = await dbContext.PendingBookings.SingleAsync();
        await DeliverPaidWebhookAsync(dbContext, pending.CheckoutSessionId!, reference);

        var after = await StatusAsync(dbContext, reference);
        Assert.Equal("paid", after.Value!.State);
        Assert.NotNull(after.Value.OrderCode);
        Assert.Equal(FulfillmentType.PickupAndDelivery, after.Value.FulfillmentType);
        Assert.Equal("Purok 4, San Vicente, Carmen", after.Value.Address);
        Assert.Equal(400m, after.Value.Amount);
        var line = Assert.Single(after.Value.Services);
        Assert.Equal(2, line.Quantity);
        // No longer payable once settled.
        Assert.Null(after.Value.CheckoutUrl);
    }

    [Fact]
    public async Task Should_Create_The_Order_From_The_Return_Page_If_The_Webhook_Is_Lost()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedShop(dbContext, qrEnabled: true);
        var checkout = await StartAsync(dbContext, Booking(service.Id, 1));

        // Payment recorded, but the event never produced an order.
        var pending = await dbContext.PendingBookings.SingleAsync();
        pending.MarkPaid("pay_stranded", DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync();

        var status = await StatusAsync(dbContext, checkout.Value!.Reference);

        // A paid customer must not be left looking at a spinner for ever.
        Assert.Equal("paid", status.Value!.State);
        Assert.Single(await dbContext.LaundryOrders.ToListAsync());
    }

    [Fact]
    public async Task Should_Not_Reveal_A_Booking_For_An_Unknown_Reference()
    {
        await using var dbContext = AppDbContextFactory.Create();
        SeedShop(dbContext, qrEnabled: true);

        var status = await StatusAsync(dbContext, "PAY-20260101-GUESSEDXXX");

        Assert.False(status.IsSuccess);
        Assert.Equal(ResultStatus.NotFound, status.Status);
    }

    // --- helpers ---------------------------------------------------------

    private static CreateBookingCommand Booking(Guid serviceId, int quantity) => new(
        "Clint Villanueva",
        "09384326772",
        null,
        serviceId,
        FulfillmentType.PickupAndDelivery,
        "Purok 4, San Vicente, Carmen",
        DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(2)),
        "08:00-10:00",
        PaymentMethod.QrCodeOnlinePayment,
        quantity,
        "Please separate the whites.",
        null,
        [new BookingServiceRequest(serviceId, quantity)]);

    private static LaundryService SeedShop(AppDbContext dbContext, bool qrEnabled)
    {
        var service = new LaundryService(
            "Wash, Dry & Fold", null, "load", 170m, true, 60m, DateTimeOffset.UtcNow);
        dbContext.LaundryServices.Add(service);

        var settings = new DomainBusinessSettings(
            "Engr. Spin Laundry", "09170000000", "Madrid, Surigao del Sur", DateTimeOffset.UtcNow);
        settings.UpdatePaymentMethods(true, qrEnabled, DateTimeOffset.UtcNow);
        dbContext.BusinessSettings.Add(settings);

        dbContext.SaveChanges();
        return service;
    }

    private static OnlinePaymentOptions PaymentOptions() => new()
    {
        CheckoutCancelUrl = "https://spinner.test/payment/cancelled",
        CheckoutSuccessUrl = "https://spinner.test/payment/complete",
        PayMongoSecretKey = "sk_test_key",
        PayMongoWebhookSecret = WebhookSecret,
    };

    private static Task<Result<BookingCheckoutResponse>> StartAsync(
        AppDbContext dbContext,
        CreateBookingCommand booking) =>
        new StartBookingCheckoutHandler(
                dbContext,
                new FakeCheckoutGateway(),
                Options.Create(PaymentOptions()),
                new TestBusinessClock())
            .Handle(new StartBookingCheckoutCommand(booking), CancellationToken.None);

    private static Task<Result<BookingCheckoutStatusResponse>> StatusAsync(
        AppDbContext dbContext,
        string reference) =>
        new GetBookingCheckoutStatusHandler(dbContext, Finaliser(dbContext), new TestBusinessClock())
            .Handle(new GetBookingCheckoutStatusQuery(reference), CancellationToken.None);

    private static PaidBookingFinaliser Finaliser(AppDbContext dbContext) =>
        new(dbContext, new DirectSender(dbContext), NullLogger<PaidBookingFinaliser>.Instance);

    private static HandlePayMongoWebhookHandler Webhook(AppDbContext dbContext) =>
        new(
            dbContext,
            new PayMongoWebhookSignatureVerifier(Options.Create(PaymentOptions())),
            Finaliser(dbContext),
            new TestBusinessClock(),
            NullLogger<HandlePayMongoWebhookHandler>.Instance);

    private static Task<Result<PayMongoWebhookResponse>> DeliverPaidWebhookAsync(
        AppDbContext dbContext,
        string sessionId,
        string reference)
    {
        var body = PaidEventBody(sessionId, reference);
        var header = PayMongoWebhookSignatureVerifier.BuildHeader(
            body, WebhookSecret, new TestBusinessClock().Now.ToUnixTimeSeconds(), testMode: true);

        return Webhook(dbContext).Handle(
            new HandlePayMongoWebhookCommand(body, header), CancellationToken.None);
    }

    /// <summary>The shape PayMongo posts for a paid checkout session.</summary>
    private static string PaidEventBody(string sessionId, string reference) =>
        "{\"data\":{\"id\":\"evt_test\",\"type\":\"event\",\"attributes\":{" +
        "\"type\":\"checkout_session.payment.paid\",\"data\":{" +
        "\"id\":\"" + sessionId + "\",\"type\":\"checkout_session\",\"attributes\":{" +
        "\"reference_number\":\"" + reference + "\"," +
        "\"payment_intent\":{\"id\":\"pi_test\"}}}}}}";

    /// <summary>Hands a checkout back without calling the provider.</summary>
    private sealed class FakeCheckoutGateway : IPaymentCheckoutGateway
    {
        private int _counter;

        public bool IsConfigured => true;

        public Task<Result<CheckoutSessionResult>> CreateSessionAsync(
            CheckoutSessionRequest request,
            CancellationToken cancellationToken)
        {
            var id = $"cs_test_{Interlocked.Increment(ref _counter)}";
            return Task.FromResult(Result<CheckoutSessionResult>.Success(
                new CheckoutSessionResult(id, $"https://paymongo.test/checkout/{id}")));
        }
    }

    /// <summary>
    /// Routes the one command the finaliser sends, so the real booking pipeline runs
    /// without standing up MediatR.
    /// </summary>
    private sealed class DirectSender : ISender
    {
        private readonly AppDbContext _dbContext;

        public DirectSender(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<TResponse> Send<TResponse>(
            IRequest<TResponse> request,
            CancellationToken cancellationToken = default)
        {
            if (request is CreateBookingCommand booking)
            {
                var result = await new CreateBookingHandler(
                        _dbContext, new TestServiceAreaPolicyProvider())
                    .Handle(booking, cancellationToken);

                return (TResponse)(object)result;
            }

            throw new NotSupportedException($"Unexpected request {request.GetType().Name}.");
        }

        public Task<object?> Send(object request, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task Send<TRequest>(TRequest request, CancellationToken cancellationToken = default)
            where TRequest : IRequest =>
            throw new NotSupportedException();

        public IAsyncEnumerable<TResponse> CreateStream<TResponse>(
            IStreamRequest<TResponse> request,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public IAsyncEnumerable<object?> CreateStream(
            object request,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }
}
