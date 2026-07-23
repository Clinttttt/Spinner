using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Customers.GetCustomerList;

public sealed class GetCustomerListHandler
    : IRequestHandler<GetCustomerListQuery, Result<PagedResponse<CustomerListItemResponse>>>
{
    private readonly AppDbContext _dbContext;

    public GetCustomerListHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PagedResponse<CustomerListItemResponse>>> Handle(
        GetCustomerListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Customers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();

            query = query.Where(customer =>
                customer.FullName.ToLower().Contains(search) ||
                customer.MobileNumber.ToLower().Contains(search) ||
                (customer.EmailAddress != null && customer.EmailAddress.ToLower().Contains(search)));
        }

        var customers = await query
            .OrderBy(customer => customer.FullName)
            .ToListAsync(cancellationToken);

        var customerIds = customers.Select(customer => customer.Id).ToList();
        var orders = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Where(order => customerIds.Contains(order.CustomerId))
            .ToListAsync(cancellationToken);

        var sortedCustomers = customers
            .Select(customer =>
            {
                var customerOrders = orders
                    .Where(order => order.CustomerId == customer.Id)
                    .ToList();

                return new CustomerListItemResponse(
                    customer.Id,
                    customer.FullName,
                    customer.MobileNumber,
                    customer.EmailAddress,
                    customerOrders.Count,
                    customerOrders
                        .OrderByDescending(order => order.CreatedAt)
                        .Select(order => (DateTimeOffset?)order.CreatedAt)
                        .FirstOrDefault(),
                    customerOrders
                        .Where(order => order.PaymentStatus == PaymentStatus.Paid)
                        .Sum(order => order.EstimatedTotalAmount));
            })
            .OrderByDescending(customer => customer.TotalOrders)
            .ThenBy(customer => customer.FullName)
            .ToList();

        var page = PageRequest.NormalizePage(request.Page);
        var pageSize = PageRequest.NormalizePageSize(request.PageSize);
        var response = sortedCustomers
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Result<PagedResponse<CustomerListItemResponse>>.Success(
            PagedResponse<CustomerListItemResponse>.Create(
                response,
                page,
                pageSize,
                sortedCustomers.Count));
    }
}
