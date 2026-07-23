using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Payments;

public static class PaymentReceiptNotificationQueue
{
    public static void QueueReceiptNotifications(
        AppDbContext dbContext,
        LaundryOrder order,
        string businessName,
        bool emailEnabled,
        DateTimeOffset now)
    {
        var receiptCode = order.ReceiptCode ?? string.Empty;
        var message = $"{businessName}: Payment received for {order.OrderCode}. Digital Receipt: /receipt/{receiptCode}";

        dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
            order.Id,
            NotificationChannel.Sms,
            order.Customer.MobileNumber,
            null,
            message,
            now));

        if (!emailEnabled || string.IsNullOrWhiteSpace(order.Customer.EmailAddress))
            return;

        dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
            order.Id,
            NotificationChannel.Email,
            order.Customer.EmailAddress,
            "Your laundry digital receipt",
            message,
            now));
    }
}
