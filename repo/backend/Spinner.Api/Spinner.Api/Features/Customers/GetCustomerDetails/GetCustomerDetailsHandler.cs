using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Customers.GetCustomerDetails;

public sealed class GetCustomerDetailsHandler
    : IRequestHandler<GetCustomerDetailsQuery, Result<CustomerDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetCustomerDetailsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<CustomerDetailsResponse>> Handle(
        GetCustomerDetailsQuery request,
        CancellationToken cancellationToken)
    {
        var customer = await _dbContext.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(customer => customer.Id == request.CustomerId, cancellationToken);

        if (customer is null)
            return Result<CustomerDetailsResponse>.NotFound("Customer was not found.");

        var orders = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Where(order => order.CustomerId == request.CustomerId)
            .OrderByDescending(order => order.CreatedAt)
            .ToListAsync(cancellationToken);

        var response = new CustomerDetailsResponse(
            customer.Id,
            customer.FullName,
            customer.MobileNumber,
            customer.EmailAddress,
            orders.Count,
            orders.Select(order => (DateTimeOffset?)order.CreatedAt).FirstOrDefault(),
            orders
                .Where(order => order.PaymentStatus == PaymentStatus.Paid)
                .Sum(order => order.EstimatedTotalAmount),
            orders
                .Take(25)
                .Select(order => new CustomerOrderHistoryItemResponse(
                    order.Id,
                    order.OrderCode,
                    order.ServiceName,
                    order.PreferredDate,
                    order.PaymentStatus,
                    order.Status,
                    order.EstimatedTotalAmount,
                    order.CreatedAt))
                .ToList());

        return Result<CustomerDetailsResponse>.Success(response);
    }
}
