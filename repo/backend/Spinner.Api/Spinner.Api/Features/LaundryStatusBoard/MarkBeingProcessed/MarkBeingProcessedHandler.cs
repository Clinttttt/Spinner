using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Features.ActivityLogs;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.LaundryStatusBoard.MarkBeingProcessed;

public sealed class MarkBeingProcessedHandler
    : IRequestHandler<MarkBeingProcessedCommand, Result<OrderDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public MarkBeingProcessedHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<OrderDetailsResponse>> Handle(
        MarkBeingProcessedCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<OrderDetailsResponse>.NotFound("Order was not found.");

        var now = DateTimeOffset.UtcNow;
        var transition = order.MarkBeingProcessed(now);

        if (!transition.IsSuccess)
            return Result<OrderDetailsResponse>.Conflict(transition.Error.Message);

        ActivityLogRecorder.RecordOrderActivity(
            _dbContext,
            order,
            "OrderMarkedBeingProcessed",
            $"Order {order.OrderCode} was marked being processed.",
            now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<OrderDetailsResponse>.Success(OrderDetailsResponse.FromEntity(order));
    }
}
