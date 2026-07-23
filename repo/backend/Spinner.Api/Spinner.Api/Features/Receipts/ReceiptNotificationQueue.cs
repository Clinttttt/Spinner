using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Receipts;

public static class ReceiptNotificationQueue
{
    public static ReceiptNotificationResponse QueueReceipt(
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

        var emailQueued = false;

        if (emailEnabled && !string.IsNullOrWhiteSpace(order.Customer.EmailAddress))
        {
            dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
                order.Id,
                NotificationChannel.Email,
                order.Customer.EmailAddress,
                "Your laundry digital receipt",
                message,
                now));

            emailQueued = true;
        }

        return new ReceiptNotificationResponse(
            order.Id,
            order.OrderCode,
            receiptCode,
            SmsQueued: true,
            EmailQueued: emailQueued);
    }
}
