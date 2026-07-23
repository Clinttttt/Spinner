using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Deliveries;

public static class DeliveryNotificationQueue
{
    public static void QueueFailedDelivery(
        AppDbContext dbContext,
        LaundryOrder order,
        string businessName,
        DateTimeOffset now)
    {
        var message = $"{businessName}: Delivery for {order.OrderCode} was not completed. Please contact the laundry shop to reschedule.";

        dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
            order.Id,
            NotificationChannel.Sms,
            order.Customer.MobileNumber,
            null,
            message,
            now));
    }
}
