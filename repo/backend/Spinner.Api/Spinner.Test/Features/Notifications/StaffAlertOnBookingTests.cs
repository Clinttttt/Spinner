using Microsoft.EntityFrameworkCore;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Users;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Notifications;

/// <summary>
/// A booking placed on the website was invisible until somebody thought to open the app
/// and look. These pin down that the shop's own phones get told.
/// </summary>
public sealed class StaffAlertOnBookingTests
{
    [Fact]
    public async Task Should_Alert_Every_Registered_Phone()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = await AddUserAsync(dbContext);
        await AddDeviceAsync(dbContext, user.Id, "token-counter");
        await AddDeviceAsync(dbContext, user.Id, "token-owner-phone");

        await BookingTestData.CreateBookingAsync(dbContext);

        var pushes = await PushMessagesAsync(dbContext);

        Assert.Equal(2, pushes.Count);
        Assert.Contains("token-counter", pushes.Select(push => push.Recipient));
        Assert.Contains("token-owner-phone", pushes.Select(push => push.Recipient));
    }

    [Fact]
    public async Task Should_Not_Alert_A_Phone_That_Signed_Out()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = await AddUserAsync(dbContext);
        await AddDeviceAsync(dbContext, user.Id, "token-active");
        var retired = await AddDeviceAsync(dbContext, user.Id, "token-retired");

        retired.Retire(DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync();

        await BookingTestData.CreateBookingAsync(dbContext);

        var pushes = await PushMessagesAsync(dbContext);

        Assert.Single(pushes);
        Assert.Equal("token-active", pushes[0].Recipient);
    }

    [Fact]
    public async Task Should_Still_Take_The_Booking_When_No_Phone_Is_Registered()
    {
        await using var dbContext = AppDbContextFactory.Create();

        // The shop may not have set push up yet, and a booking must never depend on it.
        var result = await BookingTestData.CreateBookingAsync(dbContext);

        Assert.True(result.IsSuccess);
        Assert.Empty(await PushMessagesAsync(dbContext));
    }

    [Fact]
    public async Task Should_Say_Who_Booked_And_When_Without_Being_Opened()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = await AddUserAsync(dbContext);
        await AddDeviceAsync(dbContext, user.Id, "token-counter");

        await BookingTestData.CreateBookingAsync(dbContext, fullName: "Maria Santos");

        var push = (await PushMessagesAsync(dbContext)).Single();

        // This lands on a lock screen, so the useful facts have to be in the text.
        Assert.Contains("Maria Santos", push.Message);
        Assert.Contains("booking", push.Subject!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Should_Tie_The_Alert_To_The_Order_So_It_Can_Be_Opened()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = await AddUserAsync(dbContext);
        await AddDeviceAsync(dbContext, user.Id, "token-counter");

        await BookingTestData.CreateBookingAsync(dbContext);

        var order = await dbContext.LaundryOrders.AsNoTracking().SingleAsync();
        var push = (await PushMessagesAsync(dbContext)).Single();

        Assert.Equal(order.Id, push.OrderId);
    }

    private static async Task<List<NotificationOutboxMessage>> PushMessagesAsync(
        Spinner.Api.Database.AppDbContext dbContext) =>
        await dbContext.NotificationOutboxMessages
            .AsNoTracking()
            .Where(message => message.Channel == NotificationChannel.Push)
            .ToListAsync();

    private static async Task<StaffUser> AddUserAsync(
        Spinner.Api.Database.AppDbContext dbContext)
    {
        var user = new StaffUser(
            "Clint Villanueva",
            "owner@spinner.test",
            "09171234567",
            "hash",
            StaffRole.Owner,
            DateTimeOffset.UtcNow);

        dbContext.StaffUsers.Add(user);
        await dbContext.SaveChangesAsync();

        return user;
    }

    private static async Task<StaffDevice> AddDeviceAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        Guid userId,
        string token)
    {
        var device = new StaffDevice(
            userId,
            token,
            DevicePlatform.Android,
            "Test phone",
            DateTimeOffset.UtcNow);

        dbContext.StaffDevices.Add(device);
        await dbContext.SaveChangesAsync();

        return device;
    }
}
