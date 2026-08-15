using Microsoft.EntityFrameworkCore;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Notifications;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Notifications;

/// <summary>
/// The alert that goes inward when money has been taken and no order came of it.
/// </summary>
/// <remarks>
/// This is the worst state the system can reach, and until now it produced a log line and
/// nothing else — so unless somebody read the container logs, the shop found out when the
/// customer asked where their laundry was.
/// </remarks>
public sealed class PaidBookingAlertTests
{
    [Fact]
    public async Task Should_Queue_One_Push_Per_Registered_Device()
    {
        await using var dbContext = AppDbContextFactory.Create();
        dbContext.StaffDevices.AddRange(Device("token-counter"), Device("token-owner"));
        await dbContext.SaveChangesAsync();

        await StaffAlertQueue.QueuePaidBookingNeedsAttentionAsync(
            dbContext,
            "PAY-20260815-ABCDEFGHJK",
            430m,
            "Kendra Mae",
            "Every selected service must support pickup and delivery.",
            DateTimeOffset.UtcNow,
            CancellationToken.None);
        await dbContext.SaveChangesAsync();

        var queued = await dbContext.NotificationOutboxMessages.ToListAsync();
        Assert.Equal(2, queued.Count);
        Assert.All(queued, message => Assert.Equal(NotificationChannel.Push, message.Channel));
    }

    [Fact]
    public async Task Should_Say_Who_Paid_How_Much_And_Why_It_Failed()
    {
        await using var dbContext = AppDbContextFactory.Create();
        dbContext.StaffDevices.Add(Device("token-counter"));
        await dbContext.SaveChangesAsync();

        await StaffAlertQueue.QueuePaidBookingNeedsAttentionAsync(
            dbContext,
            "PAY-20260815-ABCDEFGHJK",
            430m,
            "Kendra Mae",
            "Hand Wash cannot be picked up and delivered.",
            DateTimeOffset.UtcNow,
            CancellationToken.None);
        await dbContext.SaveChangesAsync();

        var message = await dbContext.NotificationOutboxMessages.SingleAsync();
        // Everything needed to act on it without opening anything else.
        Assert.Contains("Kendra Mae", message.Message);
        Assert.Contains("430.00", message.Message);
        Assert.Contains("PAY-20260815-ABCDEFGHJK", message.Message);
        Assert.Contains("Hand Wash", message.Message);
        Assert.Equal("Paid booking needs attention", message.Subject);
    }

    [Fact]
    public async Task Should_Not_Attach_An_Order_Because_There_Is_None()
    {
        // The order-less outbox constructor exists for exactly this: the whole point of the
        // alert is that no order was created.
        await using var dbContext = AppDbContextFactory.Create();
        dbContext.StaffDevices.Add(Device("token-counter"));
        await dbContext.SaveChangesAsync();

        await StaffAlertQueue.QueuePaidBookingNeedsAttentionAsync(
            dbContext,
            "PAY-1",
            100m,
            "A customer",
            "reason",
            DateTimeOffset.UtcNow,
            CancellationToken.None);
        await dbContext.SaveChangesAsync();

        var message = await dbContext.NotificationOutboxMessages.SingleAsync();
        Assert.Null(message.OrderId);
    }

    [Fact]
    public async Task Should_Queue_Nothing_When_No_Device_Is_Registered()
    {
        // Not a failure. A shop with no phone registered simply has nowhere to send this, and
        // the log line still records it.
        await using var dbContext = AppDbContextFactory.Create();

        await StaffAlertQueue.QueuePaidBookingNeedsAttentionAsync(
            dbContext,
            "PAY-1",
            100m,
            "A customer",
            "reason",
            DateTimeOffset.UtcNow,
            CancellationToken.None);
        await dbContext.SaveChangesAsync();

        Assert.Empty(dbContext.NotificationOutboxMessages);
    }

    private static StaffDevice Device(string token) =>
        new(Guid.NewGuid(), token, DevicePlatform.Android, null, DateTimeOffset.UtcNow);
}
