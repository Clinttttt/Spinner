using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Bookings.GetBookings;

public sealed class GetBookingsHandler
    : IRequestHandler<GetBookingsQuery, Result<PagedResponse<BookingListItemResponse>>>
{
    private readonly AppDbContext _dbContext;

    public GetBookingsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PagedResponse<BookingListItemResponse>>> Handle(
        GetBookingsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .Include(order => order.ServiceItems)
            .Where(order => order.Source == OrderSource.CustomerWeb);

        if (request.Status is not null)
            query = query.Where(order => order.Status == request.Status);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();
            query = query.Where(order =>
                order.OrderCode.ToLower().Contains(search) ||
                order.Customer.FullName.ToLower().Contains(search) ||
                order.Customer.MobileNumber.ToLower().Contains(search) ||
                order.Address.ToLower().Contains(search));
        }

        var page = PageRequest.NormalizePage(request.Page);
        var pageSize = PageRequest.NormalizePageSize(request.PageSize);
        var totalCount = await query.CountAsync(cancellationToken);

        var bookings = await query
            .OrderByDescending(order => order.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var response = bookings.Select(order => new BookingListItemResponse(
            order.Id,
            order.OrderCode,
            order.Customer.FullName,
            order.Customer.MobileNumber,
            order.Address,
            order.PreferredDate,
            order.PreferredTimeWindow,
            order.FulfillmentType,
            order.PaymentMethod,
            order.PaymentStatus,
            order.Status,
            order.ServiceItems.Count > 0
                ? order.ServiceItems.Select(item => item.ServiceName).ToList()
                : [order.ServiceName],
            order.EstimatedTotalAmount,
            order.CreatedAt)).ToList();

        return Result<PagedResponse<BookingListItemResponse>>.Success(
            PagedResponse<BookingListItemResponse>.Create(response, page, pageSize, totalCount));
    }
}
