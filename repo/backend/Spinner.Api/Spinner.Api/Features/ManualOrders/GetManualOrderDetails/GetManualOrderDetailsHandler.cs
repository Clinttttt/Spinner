using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.ManualOrders.GetManualOrderDetails;

public sealed class GetManualOrderDetailsHandler
    : IRequestHandler<GetManualOrderDetailsQuery, Result<OrderDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetManualOrderDetailsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<OrderDetailsResponse>> Handle(
        GetManualOrderDetailsQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(item => item.Customer)
            .Include(item => item.ServiceItems)
            .FirstOrDefaultAsync(
                item => item.Id == request.OrderId && item.Source == OrderSource.OwnerManual,
                cancellationToken);

        return order is null
            ? Result<OrderDetailsResponse>.NotFound("Manual order was not found.")
            : Result<OrderDetailsResponse>.Success(OrderDetailsResponse.FromEntity(order));
    }
}
