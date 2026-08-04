using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Time;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Reports.GetDailySalesReport;

public sealed class GetDailySalesReportHandler
    : IRequestHandler<GetDailySalesReportQuery, Result<DailySalesReportResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IBusinessClock _businessClock;

    public GetDailySalesReportHandler(AppDbContext dbContext, IBusinessClock businessClock)
    {
        _dbContext = dbContext;
        _businessClock = businessClock;
    }

    public async Task<Result<DailySalesReportResponse>> Handle(
        GetDailySalesReportQuery request,
        CancellationToken cancellationToken)
    {
        // The day's work, by the date the customer asked for.
        var dayOrders = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.ServiceItems)
            .Where(order => order.PreferredDate == request.Date)
            .ToListAsync(cancellationToken);

        // Revenue is a separate question from workload, and has to be answered by
        // when the money actually arrived.
        //
        // This used to sum the paid orders inside dayOrders, keyed on PreferredDate.
        // That date is reschedulable, so moving a paid order to another day moved its
        // revenue with it: the takings for a day that had already been counted could
        // change afterwards, and one payment could be reported on two different days.
        // It also disagreed with the transaction history, which has always used PaidAt.
        var paidOrders = await LoadOrdersPaidOnAsync(request.Date, cancellationToken);

        var topService = dayOrders
            .SelectMany(order => order.ServiceItems.Count > 0
                ? order.ServiceItems.Select(item => item.ServiceName)
                : [order.ServiceName])
            .GroupBy(serviceName => serviceName)
            .Select(group => new
            {
                ServiceName = group.Key,
                Count = group.Count()
            })
            .OrderByDescending(service => service.Count)
            .ThenBy(service => service.ServiceName)
            .FirstOrDefault();

        var response = new DailySalesReportResponse(
            request.Date,
            dayOrders.Count,
            dayOrders.Count(order => order.Status == OrderStatus.Completed),
            dayOrders.Count(order => order.Status is not OrderStatus.Completed and not OrderStatus.Rejected),
            dayOrders.Count(order => order.Status == OrderStatus.Rejected),
            paidOrders.Sum(order => order.EstimatedTotalAmount),
            paidOrders
                .Where(order => order.PaymentMethod == PaymentMethod.CashOnDelivery)
                .Sum(order => order.EstimatedTotalAmount),
            paidOrders
                .Where(order => order.PaymentMethod == PaymentMethod.QrCodeOnlinePayment)
                .Sum(order => order.EstimatedTotalAmount),
            dayOrders
                .Where(order => order.PaymentStatus == PaymentStatus.Unpaid && order.Status != OrderStatus.Rejected)
                .Sum(order => order.EstimatedTotalAmount),
            dayOrders.Count(order => order.FulfillmentType == FulfillmentType.PickupAndDelivery),
            topService?.ServiceName,
            topService?.Count ?? 0);

        return Result<DailySalesReportResponse>.Success(response);
    }

    /// <summary>
    /// Orders whose payment landed on the given business date.
    /// </summary>
    /// <remarks>
    /// The candidate window is widened by a day on each side and then filtered in
    /// business time, because the shop is UTC+8: a payment taken at 08:30 local on
    /// the 4th is stored as 00:30Z on the 4th, and one taken at 01:00 local is
    /// 17:00Z on the 3rd. Comparing the stored instant against a UTC day boundary
    /// would file the early-morning takings under the previous day.
    ///
    /// Rejected orders are excluded: a turned-down job is not takings even if a
    /// payment was recorded against it, and that is a refund to settle rather than
    /// revenue to report.
    /// </remarks>
    private async Task<List<LaundryOrder>> LoadOrdersPaidOnAsync(
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
            .ToListAsync(cancellationToken);

        return candidates
            .Where(order => _businessClock.ToBusinessDate(order.PaidAt!.Value) == businessDate)
            .ToList();
    }
}
