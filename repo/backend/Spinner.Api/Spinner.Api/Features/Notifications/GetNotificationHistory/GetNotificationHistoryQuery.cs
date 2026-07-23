using MediatR;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Notifications.GetNotificationHistory;

public sealed record GetNotificationHistoryQuery(
    Guid? OrderId,
    string? Status,
    int Page = 1,
    int PageSize = 25)
    : IRequest<Result<PagedResponse<NotificationHistoryItemResponse>>>;
