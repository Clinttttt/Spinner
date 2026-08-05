using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Notifications;

/// <summary>
/// Tells the shop's own phones that something needs attention.
/// </summary>
/// <remarks>
/// Every other notification in the system goes to a customer. This is the one that goes
/// inward, and it exists because a booking placed on the website was otherwise invisible
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
        var tokens = await dbContext.StaffDevices
            .AsNoTracking()
            .Where(device => device.IsActive)
            .Select(device => device.RegistrationToken)
            .ToListAsync(cancellationToken);

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
}
