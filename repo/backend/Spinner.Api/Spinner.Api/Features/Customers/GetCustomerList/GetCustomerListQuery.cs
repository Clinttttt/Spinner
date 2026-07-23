using MediatR;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Customers.GetCustomerList;

public sealed record GetCustomerListQuery(
    string? Search,
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize)
    : IRequest<Result<PagedResponse<CustomerListItemResponse>>>;
