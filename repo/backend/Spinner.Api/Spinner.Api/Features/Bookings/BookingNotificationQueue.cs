using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.BusinessSettings;

namespace Spinner.Api.Features.Bookings;

public static class BookingNotificationQueue
{
    public static void QueueBookingConfirmed(
        AppDbContext dbContext,
        LaundryOrder order,
        string businessName,
        BusinessSettingsResponse settings,
        DateTimeOffset now)
    {
        var message = $"{businessName}: Your booking {order.OrderCode} is confirmed for " +
            $"{order.PreferredDate:yyyy-MM-dd}, {order.PreferredTimeWindow}. Track: /track/{order.TrackingCode}";

        QueueSmsIfEnabled(dbContext, order, settings.IsSmsBookingConfirmedEnabled, message, now);
        QueueEmailIfEnabled(
            dbContext,
            order,
            settings.IsEmailBookingConfirmedEnabled,
            "Your laundry booking is confirmed",
            message,
            now);
    }

    public static void QueueBookingRejected(
        AppDbContext dbContext,
        LaundryOrder order,
        string businessName,
        DateTimeOffset now)
    {
        var message = $"{businessName}: Your booking {order.OrderCode} was not confirmed. Please contact the laundry shop for assistance.";
        QueueSmsIfEnabled(dbContext, order, true, message, now);
    }

    public static void QueueBookingRescheduled(
        AppDbContext dbContext,
        LaundryOrder order,
        string businessName,
        DateTimeOffset now)
    {
        var message = $"{businessName}: Your booking {order.OrderCode} has been rescheduled to " +
            $"{order.PreferredDate:yyyy-MM-dd}, {order.PreferredTimeWindow}. Track: /track/{order.TrackingCode}";
        QueueSmsIfEnabled(dbContext, order, true, message, now);
    }

    private static void QueueSmsIfEnabled(
        AppDbContext dbContext,
        LaundryOrder order,
        bool enabled,
        string message,
        DateTimeOffset now)
    {
        if (!enabled)
            return;

        dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
            order.Id,
            NotificationChannel.Sms,
            order.Customer.MobileNumber,
            null,
            message,
            now));
    }

    private static void QueueEmailIfEnabled(
        AppDbContext dbContext,
        LaundryOrder order,
        bool enabled,
        string subject,
        string message,
        DateTimeOffset now)
    {
        if (!enabled || string.IsNullOrWhiteSpace(order.Customer.EmailAddress))
            return;

        dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
            order.Id,
            NotificationChannel.Email,
            order.Customer.EmailAddress,
            subject,
            message,
            now));
    }
}
