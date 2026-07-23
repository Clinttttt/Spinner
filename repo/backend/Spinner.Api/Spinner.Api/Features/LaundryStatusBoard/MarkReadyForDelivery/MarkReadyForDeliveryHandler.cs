using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Features.ActivityLogs;
using Spinner.Api.Features.BusinessSettings;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.LaundryStatusBoard.MarkReadyForDelivery;

public sealed class MarkReadyForDeliveryHandler
    : IRequestHandler<MarkReadyForDeliveryCommand, Result<OrderDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public MarkReadyForDeliveryHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<OrderDetailsResponse>> Handle(
        MarkReadyForDeliveryCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<OrderDetailsResponse>.NotFound("Order was not found.");

        var now = DateTimeOffset.UtcNow;
        var transition = order.MarkReadyForDelivery(now);

        if (!transition.IsSuccess)
            return Result<OrderDetailsResponse>.Conflict(transition.Error.Message);

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);
        LaundryStatusNotificationQueue.QueueReadyForDelivery(
            _dbContext,
            order,
            settings.BusinessName,
            settings.IsSmsReadyForDeliveryEnabled,
            now);

        ActivityLogRecorder.RecordOrderActivity(
            _dbContext,
            order,
            "OrderMarkedReadyForDelivery",
            $"Order {order.OrderCode} was marked ready for delivery.",
            now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<OrderDetailsResponse>.Success(OrderDetailsResponse.FromEntity(order));
    }
}
