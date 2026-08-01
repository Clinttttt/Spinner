using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Time;
using Spinner.Api.Database;
using Spinner.Api.Features.ActivityLogs;

namespace Spinner.Api.Features.Orders.CancelOrder;

/// <summary>
/// Closes an order the shop is not going to fulfil, so it can then be cleared.
/// </summary>
public sealed class CancelOrderHandler : IRequestHandler<CancelOrderCommand, Result<OrderDetailsResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IBusinessClock _clock;

    public CancelOrderHandler(AppDbContext dbContext, IBusinessClock clock)
    {
        _dbContext = dbContext;
        _clock = clock;
    }

    public async Task<Result<OrderDetailsResponse>> Handle(
        CancelOrderCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .Include(order => order.ServiceItems)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<OrderDetailsResponse>.NotFound("Order was not found.");

        var now = _clock.Now;
        var transition = order.Cancel(now);

        if (!transition.IsSuccess)
            return Result<OrderDetailsResponse>.Conflict(transition.Error.Message);

        ActivityLogRecorder.RecordOrderActivity(
            _dbContext,
            order,
            "OrderCancelled",
            $"Order {order.OrderCode} was cancelled and can now be cleared.",
            now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<OrderDetailsResponse>.Success(OrderDetailsResponse.FromEntity(order));
    }
}
