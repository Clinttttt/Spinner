using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Operations.GetNewBookingRequests;

public sealed class GetNewBookingRequestsHandler
    : IRequestHandler<GetNewBookingRequestsQuery, Result<IReadOnlyList<NewBookingRequestResponse>>>
{
    private readonly AppDbContext _dbContext;

    public GetNewBookingRequestsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<IReadOnlyList<NewBookingRequestResponse>>> Handle(
        GetNewBookingRequestsQuery request,
        CancellationToken cancellationToken)
    {
        var bookings = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .Where(order =>
                order.Source == OrderSource.CustomerWeb &&
                order.Status == OrderStatus.BookingReceived &&
                // Every other list excludes cleared orders; this one did not, so a
                // tidied-away job could still have surfaced here.
                order.ArchivedAt == null)
            .OrderBy(order => order.PreferredDate)
            .ThenBy(order => order.CreatedAt)
            .Select(order => new NewBookingRequestResponse(
                order.Id,
                order.OrderCode,
                order.ContactName,
                order.Customer.MobileNumber,
                order.ServiceName,
                order.FulfillmentType,
                order.Address,
                order.PreferredDate,
                order.PreferredTimeWindow,
                order.PaymentMethod,
                order.PaymentStatus,
                order.EstimatedTotalAmount,
                order.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<NewBookingRequestResponse>>.Success(bookings);
    }
}
