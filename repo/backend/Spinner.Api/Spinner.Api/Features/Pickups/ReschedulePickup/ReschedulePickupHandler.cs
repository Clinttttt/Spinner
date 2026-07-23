using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Features.BusinessSettings;

namespace Spinner.Api.Features.Pickups.ReschedulePickup;

public sealed class ReschedulePickupHandler
    : IRequestHandler<ReschedulePickupCommand, Result<PickupDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public ReschedulePickupHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PickupDetailsResponse>> Handle(
        ReschedulePickupCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<PickupDetailsResponse>.NotFound("Pickup order was not found.");

        var now = DateTimeOffset.UtcNow;
        var transition = order.ReschedulePickup(request.PreferredDate, request.PreferredTimeWindow, now);

        if (!transition.IsSuccess)
            return Result<PickupDetailsResponse>.Conflict(transition.Error.Message);

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);
        PickupNotificationQueue.QueuePickupRescheduled(_dbContext, order, settings.BusinessName, now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<PickupDetailsResponse>.Success(PickupDetailsResponse.FromEntity(order));
    }
}
