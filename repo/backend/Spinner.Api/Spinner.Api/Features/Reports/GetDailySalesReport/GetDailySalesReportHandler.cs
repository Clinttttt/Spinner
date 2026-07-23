using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Reports.GetDailySalesReport;

public sealed class GetDailySalesReportHandler
    : IRequestHandler<GetDailySalesReportQuery, Result<DailySalesReportResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetDailySalesReportHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<DailySalesReportResponse>> Handle(
        GetDailySalesReportQuery request,
        CancellationToken cancellationToken)
    {
        var dayOrders = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.ServiceItems)
            .Where(order => order.PreferredDate == request.Date)
            .ToListAsync(cancellationToken);

        var paidOrders = dayOrders
            .Where(order => order.PaymentStatus == PaymentStatus.Paid)
            .ToList();

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
}
