using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Orders.GetCustomerTracking;

public sealed class GetCustomerTrackingHandler
    : IRequestHandler<GetCustomerTrackingQuery, Result<CustomerTrackingResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetCustomerTrackingHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<CustomerTrackingResponse>> Handle(
        GetCustomerTrackingQuery request,
        CancellationToken cancellationToken)
    {
        var trackingCode = request.TrackingCode.Trim();
        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.TrackingCode == trackingCode, cancellationToken);

        if (order is null)
            return Result<CustomerTrackingResponse>.NotFound("Tracking code was not found.");

        return Result<CustomerTrackingResponse>.Success(CustomerTrackingResponse.FromEntity(order));
    }
}
