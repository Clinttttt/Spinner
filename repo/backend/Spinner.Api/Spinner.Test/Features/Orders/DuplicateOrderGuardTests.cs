using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Business;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Api.Features.ManualOrders.CreateManualOrder;
using Spinner.Test.TestHelpers;
using DomainBusinessSettings = Spinner.Api.Domain.Business.BusinessSettings;

namespace Spinner.Test.Features.Orders;

/// <summary>
/// Duplicate orders were reaching the order book two ways: a replayed submit
/// creating a second identical record, and the same job being typed again as a
/// manual order because the pickup schedule never showed the original booking.
/// </summary>
public sealed class DuplicateOrderGuardTests
{
    [Fact]
    public async Task Replayed_Booking_Submit_Should_Return_The_Original_Booking()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);

        var first = await CreateBookingAsync(dbContext, service.Id);
        var second = await CreateBookingAsync(dbContext, service.Id);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value!.OrderId, second.Value!.OrderId);
        Assert.Equal(first.Value.OrderCode, second.Value.OrderCode);
        Assert.Equal(1, await dbContext.LaundryOrders.CountAsync());
    }

    [Fact]
    public async Task A_Different_Time_Window_Should_Still_Create_A_Second_Booking()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);

        var first = await CreateBookingAsync(dbContext, service.Id, "08:00-10:00");
        var second = await CreateBookingAsync(dbContext, service.Id, "13:00-15:00");

        Assert.NotEqual(first.Value!.OrderId, second.Value!.OrderId);
        Assert.Equal(2, await dbContext.LaundryOrders.CountAsync());
    }

    [Fact]
    public async Task Manual_Order_Should_Flag_An_Existing_Customer_Booking_For_The_Same_Day()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var booking = await BookingTestData.CreateBookingAsync(dbContext);
        Assert.True(booking.IsSuccess);
        var order = await dbContext.LaundryOrders.SingleAsync();

        var result = await new CreateManualOrderHandler(dbContext).Handle(
            ManualOrderCommand(order.ServiceId, order.PreferredDate),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
        Assert.Equal("order.possible_duplicate", result.Error.Code);
        Assert.Contains(order.OrderCode, result.Error.Message);
        Assert.Equal(1, await dbContext.LaundryOrders.CountAsync());
    }

    [Fact]
    public async Task Manual_Order_Should_Be_Created_When_The_Owner_Overrides_The_Warning()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var booking = await BookingTestData.CreateBookingAsync(dbContext);
        Assert.True(booking.IsSuccess);
        var order = await dbContext.LaundryOrders.SingleAsync();

        var result = await new CreateManualOrderHandler(dbContext).Handle(
            ManualOrderCommand(order.ServiceId, order.PreferredDate) with { AllowDuplicate = true },
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderSource.OwnerManual, result.Value!.Source);
        Assert.Equal(2, await dbContext.LaundryOrders.CountAsync());
    }

    [Fact]
    public async Task Replayed_Manual_Order_Submit_Should_Return_The_Original_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);
        var command = ManualOrderCommand(
            service.Id,
            DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1))) with { AllowDuplicate = true };

        var first = await new CreateManualOrderHandler(dbContext)
            .Handle(command, CancellationToken.None);
        var second = await new CreateManualOrderHandler(dbContext)
            .Handle(command, CancellationToken.None);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value!.OrderId, second.Value!.OrderId);
        Assert.Equal(1, await dbContext.LaundryOrders.CountAsync());
    }

    private static CreateManualOrderCommand ManualOrderCommand(Guid serviceId, DateOnly date) => new(
        "Maria Santos",
        "09171234567",
        null,
        FulfillmentType.PickupAndDelivery,
        "Brgy. 10",
        date,
        "6:00 AM - 8:00 AM",
        PaymentMethod.CashOnDelivery,
        [new ManualOrderServiceRequest(serviceId, 1)],
        0m,
        null,
        0m,
        null,
        null,
        null,
        PreferredNotificationChannel.Sms,
        null);

    private static Task<Result<Spinner.Api.Features.Bookings.BookingConfirmationResponse>> CreateBookingAsync(
        AppDbContext dbContext,
        Guid serviceId,
        string timeWindow = "08:00-10:00") =>
        new CreateBookingHandler(dbContext, new TestServiceAreaPolicyProvider()).Handle(
            new CreateBookingCommand(
                "Maria Santos",
                "09171234567",
                null,
                serviceId,
                FulfillmentType.PickupAndDelivery,
                "Brgy. 10",
                DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
                timeWindow,
                PaymentMethod.CashOnDelivery,
                1,
                null),
            CancellationToken.None);

    private static LaundryService SeedService(AppDbContext dbContext)
    {
        var service = new LaundryService(
            "Wash, Dry & Fold",
            null,
            "load",
            170m,
            supportsPickupAndDelivery: true,
            deliveryFee: 30m,
            DateTimeOffset.UtcNow);

        dbContext.LaundryServices.Add(service);
        dbContext.BusinessSettings.Add(new DomainBusinessSettings(
            "Engr. Spin Laundry",
            "09170000000",
            "Cabadbaran City",
            DateTimeOffset.UtcNow));
        dbContext.SaveChanges();

        return service;
    }
}
