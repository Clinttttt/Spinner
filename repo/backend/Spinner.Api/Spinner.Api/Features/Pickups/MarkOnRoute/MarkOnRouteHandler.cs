using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Pickups.MarkOnRoute;

/// <summary>
/// Records that the rider has set out for a pickup.
/// </summary>
/// <remarks>
/// Exists because the app already offered the step and had nowhere to put it: the change
/// was made in memory only, so the column emptied the next time the schedule refreshed and
/// a rider who was already on the road appeared not to have left.
///
/// Deliberately sends the customer nothing. "On the way" is the shop's own working state,
/// and the arrival is what the customer is told about, by the picked-up notification.
/// </remarks>
public sealed class MarkOnRouteHandler : IRequestHandler<MarkOnRouteCommand, Result<PickupDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public MarkOnRouteHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PickupDetailsResponse>> Handle(
        MarkOnRouteCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<PickupDetailsResponse>.NotFound("Pickup order was not found.");

        var transition = order.MarkOnRoute(DateTimeOffset.UtcNow);

        if (!transition.IsSuccess)
            return Result<PickupDetailsResponse>.Conflict(transition.Error.Message);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<PickupDetailsResponse>.Success(PickupDetailsResponse.FromEntity(order));
    }
}
