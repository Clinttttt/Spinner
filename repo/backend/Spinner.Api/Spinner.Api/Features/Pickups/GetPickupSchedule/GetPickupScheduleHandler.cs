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
        // The pickup schedule is a day view of every pickup job the rider may
        // touch, not only the ones already confirmed. Previously bookings still
        // awaiting confirmation, completed jobs, and jobs already collected were
        // filtered out server-side, which left the whole screen empty and gave
        // the owner no way to see a real customer booking. Only rejected and
        // cleared (archived) orders are hidden now; the client buckets the rest.
        var query = _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .Include(order => order.ServiceItems)
            .Where(order => order.FulfillmentType == FulfillmentType.PickupAndDelivery)
            .Where(order => order.PreferredDate == request.Date)
            .Where(order => order.Status != OrderStatus.Rejected)
            .Where(order => order.ArchivedAt == null);

        if (!request.IncludeCollected)
        {
            query = query.Where(order =>
                order.PickupStatus != Domain.Orders.PickupStatus.PickedUp &&
                order.Status != OrderStatus.Completed);
        }

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
