using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Pickups;

public static class PickupNotificationQueue
{
    public static void QueuePickedUp(
        AppDbContext dbContext,
        LaundryOrder order,
        string businessName,
        bool smsEnabled,
        DateTimeOffset now)
    {
        if (!smsEnabled)
            return;

        var message = $"{businessName}: Your laundry {order.OrderCode} has been picked up. Track: /track/{order.TrackingCode}";
        QueueSms(dbContext, order, message, now);
    }

    public static void QueuePickupRescheduled(
        AppDbContext dbContext,
        LaundryOrder order,
        string businessName,
        DateTimeOffset now)
    {
        var message = $"{businessName}: Pickup for {order.OrderCode} has been rescheduled to " +
            $"{order.PreferredDate:yyyy-MM-dd}, {order.PreferredTimeWindow}. Track: /track/{order.TrackingCode}";
        QueueSms(dbContext, order, message, now);
    }

    public static void QueuePickupFailed(
        AppDbContext dbContext,
        LaundryOrder order,
        string businessName,
        DateTimeOffset now)
    {
        var message = $"{businessName}: Pickup for {order.OrderCode} was not completed. Please contact the laundry shop to reschedule.";
        QueueSms(dbContext, order, message, now);
    }

    private static void QueueSms(AppDbContext dbContext, LaundryOrder order, string message, DateTimeOffset now)
    {
        dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
            order.Id,
            NotificationChannel.Sms,
            order.Customer.MobileNumber,
            null,
            message,
            now));
    }
}
