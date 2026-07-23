using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Payments.CalculateOrderTotal;

public sealed class CalculateOrderTotalHandler : IRequestHandler<CalculateOrderTotalQuery, Result<OrderTotalResponse>>
{
    private readonly AppDbContext _dbContext;

    public CalculateOrderTotalHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<OrderTotalResponse>> Handle(
        CalculateOrderTotalQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<OrderTotalResponse>.NotFound("Order was not found.");

        return Result<OrderTotalResponse>.Success(OrderTotalResponse.FromEntity(order));
    }
}
