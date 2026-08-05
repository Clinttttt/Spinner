using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Customers;
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
        var page = PageRequest.NormalizePage(request.Page);
        var pageSize = PageRequest.NormalizePageSize(request.PageSize);

        var customers = Filter(request);
        var totalCount = await customers.CountAsync(cancellationToken);
        var items = await PageOf(customers, page, pageSize).ToListAsync(cancellationToken);

        return Result<PagedResponse<CustomerListItemResponse>>.Success(
            PagedResponse<CustomerListItemResponse>.Create(items, page, pageSize, totalCount));
    }

    /// <summary>
    /// Renders the query this handler would run, as SQL.
    /// </summary>
    /// <remarks>
    /// For tests only. This query passed every in-memory test and then failed on the
    /// first real request, because ordering by a member of a record built through its
    /// positional constructor has no SQL form and the in-memory provider does not care.
    /// </remarks>
    internal string BuildQueryForTranslationCheck(GetCustomerListQuery request) =>
        PageOf(
                Filter(request),
                PageRequest.NormalizePage(request.Page),
                PageRequest.NormalizePageSize(request.PageSize))
            .ToQueryString();

    private IQueryable<Customer> Filter(GetCustomerListQuery request)
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

        return customers;
    }

    private IQueryable<CustomerListItemResponse> PageOf(
        IQueryable<Customer> customers,
        int page,
        int pageSize) =>
        customers
            // Ordered by the aggregate expressions themselves rather than by members of
            // a projection. EF cannot see through a record's positional constructor, so
            // ordering by a constructor argument leaves it with nothing to translate and
            // the whole query fails against PostgreSQL — something the in-memory
            // provider used in tests happily allows.
            .OrderByDescending(customer =>
                _dbContext.LaundryOrders.Count(order => order.CustomerId == customer.Id))
            .ThenBy(customer => customer.FullName)
            // Tie-break the in-memory sort never needed but paging does: without a
            // total order the database may place customers with the same order count
            // differently on each page, showing one twice and hiding another.
            .ThenBy(customer => customer.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            // The three figures are correlated subqueries, so the database returns one
            // row per customer with the totals already worked out, and only the page
            // being displayed is ever materialised.
            .Select(customer => new CustomerListItemResponse(
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
}
