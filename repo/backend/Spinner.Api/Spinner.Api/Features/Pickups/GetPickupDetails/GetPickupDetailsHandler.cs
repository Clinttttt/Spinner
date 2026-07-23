using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Pickups.GetPickupDetails;

public sealed class GetPickupDetailsHandler : IRequestHandler<GetPickupDetailsQuery, Result<PickupDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetPickupDetailsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PickupDetailsResponse>> Handle(
        GetPickupDetailsQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<PickupDetailsResponse>.NotFound("Pickup order was not found.");

        if (order.FulfillmentType != FulfillmentType.PickupAndDelivery)
            return Result<PickupDetailsResponse>.NotFound("Pickup order was not found.");

        return Result<PickupDetailsResponse>.Success(PickupDetailsResponse.FromEntity(order));
    }
}
