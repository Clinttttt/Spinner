using Microsoft.EntityFrameworkCore;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Test.TestHelpers;
using DomainBusinessSettings = Spinner.Api.Domain.Business.BusinessSettings;

namespace Spinner.Test.Features.Bookings;

public sealed class CreateBookingHandlerTests
{
    [Fact]
    public async Task CreateBooking_Should_Create_Customer_Order_And_Queue_BookingReceived_Sms()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);
        dbContext.BusinessSettings.Add(CreateSettings(isSmsBookingReceivedEnabled: true));
        await dbContext.SaveChangesAsync();

        var handler = new CreateBookingHandler(dbContext, new TestServiceAreaPolicyProvider());

        var result = await handler.Handle(CreateCommand(service.Id), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.BookingReceived, result.Value!.Status);
        Assert.Equal(PaymentStatus.Unpaid, result.Value.PaymentStatus);
        Assert.Equal(200m, result.Value.EstimatedTotalAmount);
        Assert.Single(dbContext.Customers);
        Assert.Single(dbContext.LaundryOrders);

        var notification = Assert.Single(dbContext.NotificationOutboxMessages);
        Assert.Equal(NotificationChannel.Sms, notification.Channel);
        Assert.Equal(NotificationStatus.Pending, notification.Status);
        Assert.Contains(result.Value.OrderCode, notification.Message);
    }

    [Fact]
    public async Task CreateBooking_Should_Update_Existing_Customer_When_Mobile_Number_Matches()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);
        dbContext.BusinessSettings.Add(CreateSettings(isSmsBookingReceivedEnabled: false));
        await dbContext.SaveChangesAsync();

        var handler = new CreateBookingHandler(dbContext, new TestServiceAreaPolicyProvider());
        await handler.Handle(CreateCommand(service.Id), CancellationToken.None);

        var secondResult = await handler.Handle(
            CreateCommand(service.Id) with
            {
                FullName = "Maria S.",
                EmailAddress = "maria@example.com",
                // A different slot, so this is a genuine second booking rather
                // than a replayed submit.
                PreferredTimeWindow = "1:00 PM - 3:00 PM"
            },
            CancellationToken.None);

        Assert.True(secondResult.IsSuccess);
        Assert.Single(dbContext.Customers);

        var customer = await dbContext.Customers.SingleAsync();
        Assert.Equal("Maria S.", customer.FullName);
        Assert.Equal("maria@example.com", customer.EmailAddress);
        Assert.Equal(2, dbContext.LaundryOrders.Count());
    }

    [Fact]
    public async Task CreateBooking_Should_Not_Duplicate_A_Replayed_Submit()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);
        dbContext.BusinessSettings.Add(CreateSettings(isSmsBookingReceivedEnabled: true));
        await dbContext.SaveChangesAsync();

        var handler = new CreateBookingHandler(dbContext, new TestServiceAreaPolicyProvider());
        var first = await handler.Handle(CreateCommand(service.Id), CancellationToken.None);
        var replay = await handler.Handle(CreateCommand(service.Id), CancellationToken.None);

        Assert.True(replay.IsSuccess);
        Assert.Equal(first.Value!.OrderCode, replay.Value!.OrderCode);
        Assert.Single(dbContext.LaundryOrders);
        Assert.Single(dbContext.NotificationOutboxMessages);
    }

    [Fact]
    public async Task CreateBooking_Should_Fail_When_Service_Is_Not_Active()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);
        service.Disable(DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync();

        var result = await new CreateBookingHandler(dbContext, new TestServiceAreaPolicyProvider())
            .Handle(CreateCommand(service.Id), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task CreateBooking_Should_Fail_When_Qr_Payment_Is_Disabled()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);
        dbContext.BusinessSettings.Add(CreateSettings(isQrEnabled: false));
        await dbContext.SaveChangesAsync();

        var result = await new CreateBookingHandler(dbContext, new TestServiceAreaPolicyProvider())
            .Handle(CreateCommand(service.Id) with { PaymentMethod = PaymentMethod.QrCodeOnlinePayment }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.Validation, result.Status);
        Assert.Empty(dbContext.LaundryOrders);
    }

    [Fact]
    public async Task CreateBooking_Should_Fail_When_Pickup_Service_Does_Not_Support_Delivery()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = new LaundryService(
            "Drop-off Laundry",
            null,
            "load",
            150m,
            supportsPickupAndDelivery: false,
            deliveryFee: null,
            DateTimeOffset.UtcNow);
        dbContext.LaundryServices.Add(service);
        await dbContext.SaveChangesAsync();

        var result = await new CreateBookingHandler(dbContext, new TestServiceAreaPolicyProvider())
            .Handle(CreateCommand(service.Id), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.Validation, result.Status);
    }

    private static CreateBookingCommand CreateCommand(Guid serviceId) => new(
        "Maria Santos",
        "09171234567",
        null,
        serviceId,
        FulfillmentType.PickupAndDelivery,
        "Brgy. 10, Cabadbaran City",
        DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
        "6:00 AM - 8:00 AM",
        PaymentMethod.CashOnDelivery,
        LoadCount: 1,
        "Please call before pickup.");

    private static LaundryService SeedService(Spinner.Api.Database.AppDbContext dbContext)
    {
        var service = new LaundryService(
            "Wash, Dry & Fold",
            "Standard laundry",
            "load",
            170m,
            supportsPickupAndDelivery: true,
            deliveryFee: 30m,
            DateTimeOffset.UtcNow);

        dbContext.LaundryServices.Add(service);

        return service;
    }

    private static DomainBusinessSettings CreateSettings(
        bool isSmsBookingReceivedEnabled = true,
        bool isQrEnabled = false)
    {
        var settings = new DomainBusinessSettings(
            "Engr. Spin Laundry",
            "09170000000",
            "Cabadbaran City",
            DateTimeOffset.UtcNow);

        settings.UpdateNotificationSettings(
            isSmsBookingReceivedEnabled,
            isSmsBookingConfirmedEnabled: true,
            isSmsPickedUpEnabled: true,
            isSmsReadyForDeliveryEnabled: true,
            isSmsCompletedEnabled: true,
            isEmailBookingConfirmedEnabled: true,
            isEmailReceiptEnabled: true,
            isEmailCompletedEnabled: true,
            DateTimeOffset.UtcNow);

        if (isQrEnabled)
            settings.UpdatePaymentMethods(true, true, DateTimeOffset.UtcNow);

        return settings;
    }
}
