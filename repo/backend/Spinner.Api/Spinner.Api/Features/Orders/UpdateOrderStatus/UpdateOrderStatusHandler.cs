using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Features.ActivityLogs;

namespace Spinner.Api.Features.Orders.UpdateOrderStatus;

public sealed class UpdateOrderStatusHandler
    : IRequestHandler<UpdateOrderStatusCommand, Result<OrderDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public UpdateOrderStatusHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<OrderDetailsResponse>> Handle(
        UpdateOrderStatusCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<OrderDetailsResponse>.NotFound("Order was not found.");

        var now = DateTimeOffset.UtcNow;
        var transition = order.UpdateStatus(request.Status, now);

        if (!transition.IsSuccess)
            return Result<OrderDetailsResponse>.Conflict(transition.Error.Message);

        ActivityLogRecorder.RecordOrderActivity(
            _dbContext,
            order,
            "OrderStatusUpdated",
            $"Order {order.OrderCode} status changed to {order.Status}.",
            now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<OrderDetailsResponse>.Success(OrderDetailsResponse.FromEntity(order));
    }
}
