using MediatR;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Reports.GetOrderHistory;

public sealed record GetOrderHistoryQuery(
    string? Search,
    DateOnly? From,
    DateOnly? To,
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize)
    : IRequest<Result<PagedResponse<OrderHistoryItemResponse>>>;
