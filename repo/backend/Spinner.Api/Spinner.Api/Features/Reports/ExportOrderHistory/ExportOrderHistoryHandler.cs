using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Features.Reports.GetOrderHistory;

namespace Spinner.Api.Features.Reports.ExportOrderHistory;

public sealed class ExportOrderHistoryHandler
    : IRequestHandler<ExportOrderHistoryQuery, Result<OrderHistoryExportResponse>>
{
    private readonly AppDbContext _dbContext;

    public ExportOrderHistoryHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<OrderHistoryExportResponse>> Handle(
        ExportOrderHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .AsQueryable();

        if (request.From is not null)
            query = query.Where(order => order.PreferredDate >= request.From.Value);

        if (request.To is not null)
            query = query.Where(order => order.PreferredDate <= request.To.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();

            query = query.Where(order =>
                order.OrderCode.ToLower().Contains(search) ||
                order.TrackingCode.ToLower().Contains(search) ||
                order.ContactName.ToLower().Contains(search) ||
                order.Customer.MobileNumber.ToLower().Contains(search));
        }

        var orders = await query
            .OrderByDescending(order => order.PreferredDate)
            .ThenByDescending(order => order.CreatedAt)
            .Select(order => new OrderHistoryItemResponse(
                order.Id,
                order.OrderCode,
                order.Source,
                order.ContactName,
                order.Customer.MobileNumber,
                order.ServiceName,
                order.PreferredDate,
                order.PreferredTimeWindow,
                order.FulfillmentType,
                order.PaymentMethod,
                order.PaymentStatus,
                order.Status,
                order.EstimatedTotalAmount,
                order.CreatedAt,
                order.UpdatedAt))
            .ToListAsync(cancellationToken);

        var csv = new StringBuilder();
        csv.AppendLine("Order Code,Source,Customer,Mobile,Service,Preferred Date,Time Window,Fulfillment,Payment Method,Payment Status,Order Status,Total Amount");

        foreach (var order in orders)
        {
            csv.AppendLine(string.Join(',', new[]
            {
                Escape(order.OrderCode),
                Escape(order.Source.ToString()),
                Escape(order.CustomerName),
                Escape(order.MobileNumber),
                Escape(order.ServiceName),
                Escape(order.PreferredDate.ToString("yyyy-MM-dd")),
                Escape(order.PreferredTimeWindow),
                Escape(order.FulfillmentType.ToString()),
                Escape(order.PaymentMethod.ToString()),
                Escape(order.PaymentStatus.ToString()),
                Escape(order.Status.ToString()),
                Escape(order.TotalAmount.ToString("0.00"))
            }));
        }

        var fileName = request.From is not null || request.To is not null
            ? $"order-history-{request.From?.ToString("yyyyMMdd") ?? "start"}-{request.To?.ToString("yyyyMMdd") ?? "end"}.csv"
            : "order-history.csv";

        return Result<OrderHistoryExportResponse>.Success(new OrderHistoryExportResponse(
            fileName,
            "text/csv",
            csv.ToString(),
            orders.Count));
    }

    private static string Escape(string value)
    {
        if (!value.Contains(',') && !value.Contains('"') && !value.Contains('\n') && !value.Contains('\r'))
            return value;

        return $"\"{value.Replace("\"", "\"\"")}\"";
    }
}
