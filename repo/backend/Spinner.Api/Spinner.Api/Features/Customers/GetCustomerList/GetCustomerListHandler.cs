using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Customers.GetCustomerList;

/// <summary>
/// The shop's customers, busiest first.
/// </summary>
/// <remarks>
/// Counted, aggregated, sorted and paged in the database. It used to read every
/// customer and then effectively the entire orders table — every column of every
/// order ever placed — to work out three numbers per customer, then sort and page the
/// result in memory. That is the single heaviest read in the application and it grows
/// with every order the shop takes.
/// </remarks>
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
        var customers = _dbContext.Customers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();

            customers = customers.Where(customer =>
                customer.FullName.ToLower().Contains(search) ||
                customer.MobileNumber.ToLower().Contains(search) ||
                (customer.EmailAddress != null && customer.EmailAddress.ToLower().Contains(search)));
        }

        // The three figures are computed as correlated subqueries against the orders
        // table, so the database returns one row per customer with the totals already
        // worked out. Only the page being displayed is ever materialised.
        var rows = customers.Select(customer => new CustomerListItemResponse(
            customer.Id,
            customer.FullName,
            customer.MobileNumber,
            customer.EmailAddress,
            _dbContext.LaundryOrders.Count(order => order.CustomerId == customer.Id),
            _dbContext.LaundryOrders
                .Where(order => order.CustomerId == customer.Id)
                .Max(order => (DateTimeOffset?)order.CreatedAt),
            _dbContext.LaundryOrders
                .Where(order =>
                    order.CustomerId == customer.Id &&
                    order.PaymentStatus == PaymentStatus.Paid)
                .Sum(order => (decimal?)order.EstimatedTotalAmount) ?? 0m));

        var page = PageRequest.NormalizePage(request.Page);
        var pageSize = PageRequest.NormalizePageSize(request.PageSize);

        var totalCount = await customers.CountAsync(cancellationToken);

        var items = await rows
            // Busiest first, then by name, then by id. The id is a tie-break the old
            // in-memory sort did not need but paging does: without a total order the
            // database may place customers with the same order count differently on
            // each page, showing one twice and hiding another.
            .OrderByDescending(customer => customer.TotalOrders)
            .ThenBy(customer => customer.FullName)
            .ThenBy(customer => customer.CustomerId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Result<PagedResponse<CustomerListItemResponse>>.Success(
            PagedResponse<CustomerListItemResponse>.Create(items, page, pageSize, totalCount));
    }
}
