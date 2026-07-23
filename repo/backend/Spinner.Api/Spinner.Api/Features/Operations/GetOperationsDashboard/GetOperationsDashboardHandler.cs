using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Operations.GetOperationsDashboard;

public sealed class GetOperationsDashboardHandler
    : IRequestHandler<GetOperationsDashboardQuery, Result<OperationsDashboardResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetOperationsDashboardHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<OperationsDashboardResponse>> Handle(
        GetOperationsDashboardQuery request,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);

        var response = new OperationsDashboardResponse(
            NewBookings: await _dbContext.LaundryOrders.CountAsync(order => order.Status == OrderStatus.BookingReceived, cancellationToken),
            ForPickup: await _dbContext.LaundryOrders.CountAsync(order => order.Status == OrderStatus.Confirmed && order.FulfillmentType == FulfillmentType.PickupAndDelivery, cancellationToken),
            BeingProcessed: await _dbContext.LaundryOrders.CountAsync(order => order.Status == OrderStatus.BeingProcessed, cancellationToken),
            ReadyForDelivery: await _dbContext.LaundryOrders.CountAsync(order => order.Status == OrderStatus.ReadyForDelivery, cancellationToken),
            UnpaidOrders: await _dbContext.LaundryOrders.CountAsync(order => order.PaymentStatus == PaymentStatus.Unpaid, cancellationToken),
            CompletedToday: await _dbContext.LaundryOrders.CountAsync(order => order.Status == OrderStatus.Completed && order.PreferredDate == today, cancellationToken),
            SalesToday: await _dbContext.LaundryOrders
                .Where(order => order.Status == OrderStatus.Completed && order.PaymentStatus == PaymentStatus.Paid && order.PreferredDate == today)
                .SumAsync(order => order.EstimatedTotalAmount, cancellationToken));

        return Result<OperationsDashboardResponse>.Success(response);
    }
}
