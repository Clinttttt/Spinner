using MediatR;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Pickups.GetPickupSchedule;

public sealed record GetPickupScheduleQuery(
    DateOnly Date,
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize)
    : IRequest<Result<PagedResponse<PickupScheduleItemResponse>>>;
