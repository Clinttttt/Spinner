using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Pickups.GetPickupSchedule;

public sealed class GetPickupScheduleHandler
    : IRequestHandler<GetPickupScheduleQuery, Result<PagedResponse<PickupScheduleItemResponse>>>
{
    private readonly AppDbContext _dbContext;

    public GetPickupScheduleHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PagedResponse<PickupScheduleItemResponse>>> Handle(
        GetPickupScheduleQuery request,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .Where(order => order.FulfillmentType == FulfillmentType.PickupAndDelivery)
            .Where(order => order.PreferredDate == request.Date)
            .Where(order => order.Status != OrderStatus.BookingReceived)
            .Where(order => order.Status != OrderStatus.Rejected)
            .Where(order => order.Status != OrderStatus.Completed)
            .Where(order => order.PickupStatus != PickupStatus.PickedUp);

        var page = PageRequest.NormalizePage(request.Page);
        var pageSize = PageRequest.NormalizePageSize(request.PageSize);
        var totalCount = await query.CountAsync(cancellationToken);
        var pickupOrders = await query
            .OrderBy(order => order.PreferredTimeWindow)
            .ThenBy(order => order.Customer.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var pickups = pickupOrders
            .Select(PickupScheduleItemResponse.FromEntity)
            .ToList();

        return Result<PagedResponse<PickupScheduleItemResponse>>.Success(
            PagedResponse<PickupScheduleItemResponse>.Create(
                pickups,
                page,
                pageSize,
                totalCount));
    }
}
