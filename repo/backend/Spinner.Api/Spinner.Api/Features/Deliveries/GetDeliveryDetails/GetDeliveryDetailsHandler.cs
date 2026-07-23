using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Deliveries.GetDeliveryDetails;

public sealed class GetDeliveryDetailsHandler
    : IRequestHandler<GetDeliveryDetailsQuery, Result<DeliveryDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetDeliveryDetailsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<DeliveryDetailsResponse>> Handle(
        GetDeliveryDetailsQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null || order.FulfillmentType != FulfillmentType.PickupAndDelivery)
            return Result<DeliveryDetailsResponse>.NotFound("Delivery order was not found.");

        return Result<DeliveryDetailsResponse>.Success(DeliveryDetailsResponse.FromEntity(order));
    }
}
