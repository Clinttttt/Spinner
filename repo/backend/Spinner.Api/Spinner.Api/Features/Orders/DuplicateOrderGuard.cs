using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Orders;

/// <summary>
/// Protects the order book from accidental duplicates.
/// </summary>
/// <remarks>
/// Two distinct problems are covered:
/// <list type="number">
/// <item>
/// A replayed submit (double tap, browser retry, flaky mobile network where the
/// request actually reached the server) creates a second identical order. The
/// replay window makes create requests effectively idempotent, so the caller
/// gets the original order back instead of a second one.
/// </item>
/// <item>
/// The same job typed twice through different doors - a customer web booking
/// plus an owner-created manual order for the same customer and day. That is a
/// judgement call, so it is reported to the owner as a possible duplicate that
/// can be overridden explicitly.
/// </item>
/// </list>
/// </remarks>
public static class DuplicateOrderGuard
{
    public static readonly TimeSpan ReplayWindow = TimeSpan.FromMinutes(3);

    /// <summary>
    /// Finds an order created moments ago that matches this request exactly.
    /// </summary>
    public static Task<LaundryOrder?> FindRecentIdenticalAsync(
        AppDbContext dbContext,
        OrderSource source,
        string mobileNumber,
        FulfillmentType fulfillmentType,
        DateOnly preferredDate,
        string preferredTimeWindow,
        decimal totalAmount,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var normalizedMobile = mobileNumber.Trim();
        var normalizedWindow = preferredTimeWindow.Trim();
        var earliest = now - ReplayWindow;

        return dbContext.LaundryOrders
            .Include(order => order.Customer)
            .Include(order => order.ServiceItems)
            .Where(order =>
                order.Source == source &&
                order.Status != OrderStatus.Rejected &&
                order.Customer.MobileNumber == normalizedMobile &&
                order.FulfillmentType == fulfillmentType &&
                order.PreferredDate == preferredDate &&
                order.PreferredTimeWindow == normalizedWindow &&
                order.EstimatedTotalAmount == totalAmount &&
                order.CreatedAt >= earliest)
            .OrderByDescending(order => order.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    /// <summary>
    /// Finds an unfinished order for the same customer and day that came in
    /// through the other channel.
    /// </summary>
    public static Task<LaundryOrder?> FindActiveCrossChannelAsync(
        AppDbContext dbContext,
        OrderSource otherSource,
        string mobileNumber,
        DateOnly preferredDate,
        CancellationToken cancellationToken)
    {
        var normalizedMobile = mobileNumber.Trim();

        return dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .Where(order =>
                order.Source == otherSource &&
                order.Customer.MobileNumber == normalizedMobile &&
                order.PreferredDate == preferredDate &&
                order.Status != OrderStatus.Rejected &&
                order.Status != OrderStatus.Completed &&
                order.ArchivedAt == null)
            .OrderByDescending(order => order.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
