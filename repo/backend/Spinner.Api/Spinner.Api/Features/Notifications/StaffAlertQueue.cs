using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Notifications;

/// <summary>
/// Tells the shop's own phones that something needs attention.
/// </summary>
/// <remarks>
/// Every other notification in the system goes to a customer. These are the ones that go
/// inward, and the first exists because a booking placed on the website was otherwise invisible
/// until somebody thought to open the app and look.
///
/// One message per registered device, queued on the same outbox as everything else, so a
/// push inherits the retry limit and the claim that stops a message being delivered
/// twice. Queued rather than sent inline on purpose: a booking must not fail because
/// Firebase was unreachable.
/// </remarks>
public static class StaffAlertQueue
{
    public static async Task QueueNewBookingAsync(
        AppDbContext dbContext,
        LaundryOrder order,
        string businessName,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var tokens = await ActiveDeviceTokensAsync(dbContext, cancellationToken);

        if (tokens.Count == 0)
            return;

        // Deliberately short. This lands on a lock screen, so it has to say what
        // happened and for whom without being opened.
        var subject = order.FulfillmentType == FulfillmentType.PickupAndDelivery
            ? "New pickup booking"
            : "New booking";

        var message =
            $"{order.ContactName} booked {order.ServiceName} for " +
            $"{order.PreferredDate:d MMM}, {order.PreferredTimeWindow}.";

        foreach (var token in tokens)
        {
            dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
                order.Id,
                NotificationChannel.Push,
                token,
                subject,
                message,
                now));
        }
    }

    /// <summary>
    /// Tells the shop that money has been taken but no order exists for it.
    /// </summary>
    /// <remarks>
    /// This is the worst state the system can reach: the customer has paid, the provider has
    /// confirmed it, and something stopped the order being written. Until now it produced a log
    /// line and nothing else, so unless somebody happened to read the container logs the shop
    /// would only find out when the customer asked where their laundry was.
    ///
    /// No order id is attached because there is no order — that is the whole point — so this
    /// uses the outbox's order-less constructor.
    /// </remarks>
    public static async Task QueuePaidBookingNeedsAttentionAsync(
        AppDbContext dbContext,
        string reference,
        decimal amount,
        string customerName,
        string reason,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var tokens = await ActiveDeviceTokensAsync(dbContext, cancellationToken);

        if (tokens.Count == 0)
            return;

        var message =
            $"{customerName} paid {amount:N2} but the order could not be created. " +
            $"Reference {reference}. Reason: {reason}";

        foreach (var token in tokens)
        {
            dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
                NotificationChannel.Push,
                token,
                "Paid booking needs attention",
                message,
                now));
        }
    }

    private static Task<List<string>> ActiveDeviceTokensAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken) =>
        dbContext.StaffDevices
            .AsNoTracking()
            .Where(device => device.IsActive)
            .Select(device => device.RegistrationToken)
            .ToListAsync(cancellationToken);
}
