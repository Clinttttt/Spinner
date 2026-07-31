using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Time;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Operations.GetOperationsDashboard;

public sealed class GetOperationsDashboardHandler
    : IRequestHandler<GetOperationsDashboardQuery, Result<OperationsDashboardResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IBusinessClock _clock;

    public GetOperationsDashboardHandler(AppDbContext dbContext, IBusinessClock clock)
    {
        _dbContext = dbContext;
        _clock = clock;
    }

    public async Task<Result<OperationsDashboardResponse>> Handle(
        GetOperationsDashboardQuery request,
        CancellationToken cancellationToken)
    {
        // Business-local date, not UTC: the shop is UTC+8, so a UTC date would
        // report yesterday's numbers between 00:00 and 07:59 local time.
        var today = _clock.Today;

        var response = new OperationsDashboardResponse(
            // "Needs confirmation" only applies to customer-submitted bookings.
            // Owner-created manual orders are already confirmed on creation.
            NewBookings: await _dbContext.LaundryOrders.CountAsync(
                order => order.Status == OrderStatus.BookingReceived &&
                    order.Source == OrderSource.CustomerWeb &&
                    order.ArchivedAt == null,
                cancellationToken),
            ForPickup: await _dbContext.LaundryOrders.CountAsync(
                order => order.Status == OrderStatus.Confirmed &&
                    order.FulfillmentType == FulfillmentType.PickupAndDelivery &&
                    order.ArchivedAt == null,
                cancellationToken),
            BeingProcessed: await _dbContext.LaundryOrders.CountAsync(
                order => order.Status == OrderStatus.BeingProcessed && order.ArchivedAt == null,
                cancellationToken),
            ReadyForDelivery: await _dbContext.LaundryOrders.CountAsync(
                order => order.Status == OrderStatus.ReadyForDelivery && order.ArchivedAt == null,
                cancellationToken),
            UnpaidOrders: await _dbContext.LaundryOrders.CountAsync(
                order => order.PaymentStatus == PaymentStatus.Unpaid &&
                    order.Status != OrderStatus.Rejected &&
                    order.ArchivedAt == null,
                cancellationToken),
            // Cleared orders stay in the day's totals: clearing is a list action,
            // never a financial correction.
            CompletedToday: await _dbContext.LaundryOrders.CountAsync(
                order => order.Status == OrderStatus.Completed && order.PreferredDate == today,
                cancellationToken),
            SalesToday: await _dbContext.LaundryOrders
                .Where(order => order.Status == OrderStatus.Completed &&
                    order.PaymentStatus == PaymentStatus.Paid &&
                    order.PreferredDate == today)
                .SumAsync(order => order.EstimatedTotalAmount, cancellationToken));

        return Result<OperationsDashboardResponse>.Success(response);
    }
}
