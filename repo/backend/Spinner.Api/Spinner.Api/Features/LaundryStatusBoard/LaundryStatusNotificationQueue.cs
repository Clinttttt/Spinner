using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.LaundryStatusBoard;

public static class LaundryStatusNotificationQueue
{
    public static void QueueReadyForDelivery(
        AppDbContext dbContext,
        LaundryOrder order,
        string businessName,
        bool smsEnabled,
        DateTimeOffset now)
    {
        if (!smsEnabled)
            return;

        var readyLabel = order.FulfillmentType == FulfillmentType.DropOff
            ? "ready for claim"
            : "ready for delivery";

        var message = $"{businessName}: Your laundry {order.OrderCode} is {readyLabel}. Track: /track/{order.TrackingCode}";

        dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
            order.Id,
            NotificationChannel.Sms,
            order.Customer.MobileNumber,
            null,
            message,
            now));
    }
}
