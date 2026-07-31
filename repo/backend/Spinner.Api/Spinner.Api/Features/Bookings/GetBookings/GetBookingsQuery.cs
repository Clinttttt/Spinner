using MediatR;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Bookings.GetBookings;

public sealed record GetBookingsQuery(
    string? Search,
    OrderStatus? Status,
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize,
    bool IncludeCleared = false)
    : IRequest<Result<PagedResponse<BookingListItemResponse>>>;
