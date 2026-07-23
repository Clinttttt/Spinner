using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Orders.GetOrderDetails;

public sealed class GetOrderDetailsHandler : IRequestHandler<GetOrderDetailsQuery, Result<OrderDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetOrderDetailsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<OrderDetailsResponse>> Handle(
        GetOrderDetailsQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .Include(order => order.ServiceItems)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<OrderDetailsResponse>.NotFound("Order was not found.");

        return Result<OrderDetailsResponse>.Success(OrderDetailsResponse.FromEntity(order));
    }
}
