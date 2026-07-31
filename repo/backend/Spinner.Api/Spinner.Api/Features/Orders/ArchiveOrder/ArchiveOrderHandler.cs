using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Time;
using Spinner.Api.Database;
using Spinner.Api.Features.ActivityLogs;

namespace Spinner.Api.Features.Orders.ArchiveOrder;

public sealed class ArchiveOrderHandler : IRequestHandler<ArchiveOrderCommand, Result<OrderDetailsResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IBusinessClock _clock;

    public ArchiveOrderHandler(AppDbContext dbContext, IBusinessClock clock)
    {
        _dbContext = dbContext;
        _clock = clock;
    }

    public async Task<Result<OrderDetailsResponse>> Handle(
        ArchiveOrderCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .Include(order => order.ServiceItems)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<OrderDetailsResponse>.NotFound("Order was not found.");

        var now = _clock.Now;
        var transition = request.Archive ? order.Archive(now) : order.Restore(now);

        if (!transition.IsSuccess)
            return Result<OrderDetailsResponse>.Conflict(transition.Error.Message);

        ActivityLogRecorder.RecordOrderActivity(
            _dbContext,
            order,
            request.Archive ? "OrderCleared" : "OrderRestored",
            request.Archive
                ? $"Order {order.OrderCode} was cleared from the active list."
                : $"Order {order.OrderCode} was restored to the active list.",
            now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<OrderDetailsResponse>.Success(OrderDetailsResponse.FromEntity(order));
    }
}
