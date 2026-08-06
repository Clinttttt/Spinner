using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Reports.GetOrderHistory;

public sealed class GetOrderHistoryHandler
    : IRequestHandler<GetOrderHistoryQuery, Result<PagedResponse<OrderHistoryItemResponse>>>
{
    private readonly AppDbContext _dbContext;

    public GetOrderHistoryHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PagedResponse<OrderHistoryItemResponse>>> Handle(
        GetOrderHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            // The owner needs to see every service on an order, not just the first. A
            // multi-service booking otherwise read as though only one thing was ordered.
            .Include(order => order.ServiceItems)
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

        var page = PageRequest.NormalizePage(request.Page);
        var pageSize = PageRequest.NormalizePageSize(request.PageSize);
        var totalCount = await query.CountAsync(cancellationToken);
        var orders = await query
            .OrderByDescending(order => order.PreferredDate)
            .ThenByDescending(order => order.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
                order.UpdatedAt,
                order.Address,
                order.TrackingCode,
                order.AdditionalNotes,
                order.LoadCount,
                order.EstimatedServiceAmount,
                order.EstimatedDeliveryFee,
                order.ReceiptCode,
                order.PaidAt,
                order.ServiceItems
                    .OrderBy(item => item.ServiceName)
                    .Select(item => new OrderHistoryServiceLineResponse(
                        item.ServiceName,
                        item.UnitLabel,
                        item.Quantity,
                        item.UnitPrice,
                        item.Subtotal))
                    .ToList()))
            .ToListAsync(cancellationToken);

        return Result<PagedResponse<OrderHistoryItemResponse>>.Success(
            PagedResponse<OrderHistoryItemResponse>.Create(orders, page, pageSize, totalCount));
    }
}
