using MediatR;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.ManualOrders.GetManualOrders;

public sealed record GetManualOrdersQuery(
    string? Search,
    FulfillmentType? Method,
    OrderStatus? Status,
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize,
    bool IncludeCleared = false)
    : IRequest<Result<PagedResponse<ManualOrderListItemResponse>>>;
