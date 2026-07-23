using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.LaundryStatusBoard.GetLaundryStatusBoard;

public sealed class GetLaundryStatusBoardHandler
    : IRequestHandler<GetLaundryStatusBoardQuery, Result<LaundryStatusBoardResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetLaundryStatusBoardHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<LaundryStatusBoardResponse>> Handle(
        GetLaundryStatusBoardQuery request,
        CancellationToken cancellationToken)
    {
        var orders = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .Where(order => order.Status == OrderStatus.PickedUp ||
                order.Status == OrderStatus.BeingProcessed ||
                order.Status == OrderStatus.ReadyForDelivery)
            .OrderBy(order => order.UpdatedAt)
            .ThenBy(order => order.Customer.FullName)
            .ToListAsync(cancellationToken);

        var items = orders
            .Select(LaundryStatusBoardItemResponse.FromEntity)
            .ToList();

        var response = new LaundryStatusBoardResponse(
            items.Where(item => item.Status == OrderStatus.PickedUp).ToList(),
            items.Where(item => item.Status == OrderStatus.BeingProcessed).ToList(),
            items.Where(item => item.Status == OrderStatus.ReadyForDelivery).ToList());

        return Result<LaundryStatusBoardResponse>.Success(response);
    }
}
