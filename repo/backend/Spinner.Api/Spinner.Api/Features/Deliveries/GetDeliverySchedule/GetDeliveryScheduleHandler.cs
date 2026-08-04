using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Deliveries.GetDeliverySchedule;

public sealed class GetDeliveryScheduleHandler
    : IRequestHandler<GetDeliveryScheduleQuery, Result<IReadOnlyList<DeliveryScheduleItemResponse>>>
{
    private readonly AppDbContext _dbContext;

    public GetDeliveryScheduleHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<IReadOnlyList<DeliveryScheduleItemResponse>>> Handle(
        GetDeliveryScheduleQuery request,
        CancellationToken cancellationToken)
    {
        var deliveryOrders = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .Where(order => order.FulfillmentType == FulfillmentType.PickupAndDelivery)
            .Where(order => order.Status == OrderStatus.ReadyForDelivery)
            .Where(order => order.PreferredDate <= request.Date)
            .Where(order => order.DeliveryStatus != DeliveryStatus.Delivered)
            .OrderBy(order => order.PreferredTimeWindow)
            .ThenBy(order => order.ContactName)
            .ToListAsync(cancellationToken);

        var deliveries = deliveryOrders
            .Select(DeliveryScheduleItemResponse.FromEntity)
            .ToList();

        return Result<IReadOnlyList<DeliveryScheduleItemResponse>>.Success(deliveries);
    }
}
