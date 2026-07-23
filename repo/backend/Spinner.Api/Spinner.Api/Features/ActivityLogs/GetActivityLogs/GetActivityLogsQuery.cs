using MediatR;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.ActivityLogs.GetActivityLogs;

public sealed record GetActivityLogsQuery(
    Guid? EntityId,
    string? Action,
    int Page = 1,
    int PageSize = 25)
    : IRequest<Result<PagedResponse<ActivityLogResponse>>>;
