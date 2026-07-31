using Microsoft.EntityFrameworkCore;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Api.Features.Bookings.RejectBooking;
using Spinner.Api.Features.Bookings.RescheduleBooking;
using Spinner.Test.TestHelpers;
using DomainBusinessSettings = Spinner.Api.Domain.Business.BusinessSettings;

namespace Spinner.Test.Features.Bookings;

public sealed class BookingActionHandlerTests
{
    [Fact]
    public async Task ConfirmBooking_Should_Set_Status_Confirmed_And_Queue_Configured_Notifications()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateBookingAsync(dbContext, "maria@example.com");

        var result = await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(orderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.Confirmed, result.Value!.Status);

        var notifications = await dbContext.NotificationOutboxMessages
            .Where(message => message.OrderId == orderId)
            .ToListAsync();
        Assert.Contains(notifications, message => message.Channel == NotificationChannel.Sms);
        Assert.Contains(notifications, message => message.Channel == NotificationChannel.Email);
    }

    [Fact]
    public async Task ConfirmBooking_Should_Fail_When_Booking_Is_Already_Confirmed()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateBookingAsync(dbContext, null);
        await new ConfirmBookingHandler(dbContext).Handle(new ConfirmBookingCommand(orderId), CancellationToken.None);

        var result = await new ConfirmBookingHandler(dbContext)
            .Handle(new ConfirmBookingCommand(orderId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task RejectBooking_Should_Set_Status_Rejected()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateBookingAsync(dbContext, null);

        var result = await new RejectBookingHandler(dbContext)
            .Handle(new RejectBookingCommand(orderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.Rejected, result.Value!.Status);
    }

    [Fact]
    public async Task RescheduleBooking_Should_Update_Preferred_Schedule()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = await CreateBookingAsync(dbContext, null);
        var newDate = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(3));

        var result = await new RescheduleBookingHandler(dbContext)
            .Handle(new RescheduleBookingCommand(orderId, newDate, "9:00 AM - 11:00 AM"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(newDate, result.Value!.PreferredDate);
        Assert.Equal("9:00 AM - 11:00 AM", result.Value.PreferredTimeWindow);
    }

    private static async Task<Guid> CreateBookingAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        string? emailAddress)
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
        await dbContext.SaveChangesAsync();

        var created = await new CreateBookingHandler(dbContext, new TestServiceAreaPolicyProvider()).Handle(
            new CreateBookingCommand(
                "Maria Santos",
                "09171234567",
                emailAddress,
                service.Id,
                FulfillmentType.PickupAndDelivery,
                "Brgy. 10",
                DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
                "6:00 AM - 8:00 AM",
                PaymentMethod.CashOnDelivery,
                1,
                null),
            CancellationToken.None);

        dbContext.NotificationOutboxMessages.RemoveRange(dbContext.NotificationOutboxMessages);
        await dbContext.SaveChangesAsync();

        return created.Value!.OrderId;
    }
}
