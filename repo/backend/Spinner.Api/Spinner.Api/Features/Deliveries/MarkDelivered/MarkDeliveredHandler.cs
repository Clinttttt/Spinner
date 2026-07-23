using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Deliveries.MarkDelivered;

public sealed class MarkDeliveredHandler : IRequestHandler<MarkDeliveredCommand, Result<DeliveryDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public MarkDeliveredHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<DeliveryDetailsResponse>> Handle(
        MarkDeliveredCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<DeliveryDetailsResponse>.NotFound("Delivery order was not found.");

        var transition = order.MarkDelivered(DateTimeOffset.UtcNow);

        if (!transition.IsSuccess)
            return Result<DeliveryDetailsResponse>.Conflict(transition.Error.Message);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<DeliveryDetailsResponse>.Success(DeliveryDetailsResponse.FromEntity(order));
    }
}
