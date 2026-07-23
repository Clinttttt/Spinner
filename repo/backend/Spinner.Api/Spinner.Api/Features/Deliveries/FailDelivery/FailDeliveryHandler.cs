using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Features.BusinessSettings;

namespace Spinner.Api.Features.Deliveries.FailDelivery;

public sealed class FailDeliveryHandler : IRequestHandler<FailDeliveryCommand, Result<DeliveryDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public FailDeliveryHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<DeliveryDetailsResponse>> Handle(
        FailDeliveryCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<DeliveryDetailsResponse>.NotFound("Delivery order was not found.");

        var now = DateTimeOffset.UtcNow;
        var transition = order.FailDelivery(request.Reason, now);

        if (!transition.IsSuccess)
            return Result<DeliveryDetailsResponse>.Conflict(transition.Error.Message);

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);
        DeliveryNotificationQueue.QueueFailedDelivery(_dbContext, order, settings.BusinessName, now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<DeliveryDetailsResponse>.Success(DeliveryDetailsResponse.FromEntity(order));
    }
}
