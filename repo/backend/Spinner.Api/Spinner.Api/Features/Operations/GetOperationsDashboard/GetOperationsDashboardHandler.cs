using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Time;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Operations.GetOperationsDashboard;

public sealed class GetOperationsDashboardHandler
    : IRequestHandler<GetOperationsDashboardQuery, Result<OperationsDashboardResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IBusinessClock _clock;

    public GetOperationsDashboardHandler(AppDbContext dbContext, IBusinessClock clock)
    {
        _dbContext = dbContext;
        _clock = clock;
    }

    public async Task<Result<OperationsDashboardResponse>> Handle(
        GetOperationsDashboardQuery request,
        CancellationToken cancellationToken)
    {
        // Business-local date, not UTC: the shop is UTC+8, so a UTC date would
        // report yesterday's numbers between 00:00 and 07:59 local time.
        var today = _clock.Today;

        var response = new OperationsDashboardResponse(
            // "Needs confirmation" only applies to customer-submitted bookings.
            // Owner-created manual orders are already confirmed on creation.
            NewBookings: await _dbContext.LaundryOrders.CountAsync(
                order => order.Status == OrderStatus.BookingReceived &&
                    order.Source == OrderSource.CustomerWeb &&
                    order.ArchivedAt == null,
                cancellationToken),
            ForPickup: await _dbContext.LaundryOrders.CountAsync(
                order => order.Status == OrderStatus.Confirmed &&
                    order.FulfillmentType == FulfillmentType.PickupAndDelivery &&
                    order.ArchivedAt == null,
                cancellationToken),
            BeingProcessed: await _dbContext.LaundryOrders.CountAsync(
                order => order.Status == OrderStatus.BeingProcessed && order.ArchivedAt == null,
                cancellationToken),
            ReadyForDelivery: await _dbContext.LaundryOrders.CountAsync(
                order => order.Status == OrderStatus.ReadyForDelivery && order.ArchivedAt == null,
                cancellationToken),
            UnpaidOrders: await _dbContext.LaundryOrders.CountAsync(
                order => order.PaymentStatus == PaymentStatus.Unpaid &&
                    order.Status != OrderStatus.Rejected &&
                    order.ArchivedAt == null,
                cancellationToken),
            // Cleared orders stay in the day's totals: clearing is a list action,
            // never a financial correction.
            CompletedToday: await _dbContext.LaundryOrders.CountAsync(
                order => order.Status == OrderStatus.Completed && order.PreferredDate == today,
                cancellationToken),

            // Money taken today, by when it arrived rather than by the job's preferred
            // date. The preferred date is reschedulable, so keying on it let today's
            // takings change when the owner moved an already-paid job, and disagreed
            // with the transaction history. Completion is no longer required either:
            // a prepaid booking is real money in hand before the laundry is done.
            SalesToday: await SumPaidOnAsync(today, cancellationToken),

            TransactionCount: await CountTransactionsAsync(cancellationToken));

        return Result<OperationsDashboardResponse>.Success(response);
    }

    /// <summary>
    /// How many rows the transaction history holds.
    /// </summary>
    /// <remarks>
    /// Deliberately the same two sources, with the same predicates, as
    /// GetTransactionHistoryHandler: manual money movements plus every paid order. The
    /// figure exists so the app can badge the history tab when it has something new to
    /// show, so it has to agree with what that page lists or the badge lies. In
    /// particular an unpaid booking is not counted, because it is not a transaction.
    /// </remarks>
    private async Task<int> CountTransactionsAsync(CancellationToken cancellationToken)
    {
        var manual = await _dbContext.FinancialTransactions.CountAsync(cancellationToken);

        var sales = await _dbContext.LaundryOrders.CountAsync(
            order => order.PaymentStatus == PaymentStatus.Paid && order.PaidAt != null,
            cancellationToken);

        return manual + sales;
    }

    /// <summary>
    /// Total paid on the given business date.
    /// </summary>
    /// <remarks>
    /// The window is widened by a day either side and then narrowed in business time,
    /// because the shop is UTC+8 and a stored instant does not line up with a UTC day
    /// boundary. Rejected orders are excluded: a turned-down job is not takings.
    /// </remarks>
    private async Task<decimal> SumPaidOnAsync(
        DateOnly businessDate,
        CancellationToken cancellationToken)
    {
        var windowStart = new DateTimeOffset(
            businessDate.ToDateTime(TimeOnly.MinValue).AddDays(-1),
            TimeSpan.Zero);
        var windowEnd = new DateTimeOffset(
            businessDate.ToDateTime(TimeOnly.MinValue).AddDays(2),
            TimeSpan.Zero);

        var candidates = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Where(order =>
                order.PaymentStatus == PaymentStatus.Paid &&
                order.Status != OrderStatus.Rejected &&
                order.PaidAt != null &&
                order.PaidAt >= windowStart &&
                order.PaidAt < windowEnd)
            .Select(order => new { order.PaidAt, order.EstimatedTotalAmount })
            .ToListAsync(cancellationToken);

        return candidates
            .Where(order => _clock.ToBusinessDate(order.PaidAt!.Value) == businessDate)
            .Sum(order => order.EstimatedTotalAmount);
    }
}
