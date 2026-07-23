using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Features.Notifications.GetNotificationHistory;

namespace Spinner.Api.Controllers;

[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController : ApiControllerBase
{
    public NotificationsController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet("history")]
    public async Task<ActionResult<PagedResponse<NotificationHistoryItemResponse>>> GetHistory(
        [FromQuery] Guid? orderId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(
            new GetNotificationHistoryQuery(orderId, status, page, pageSize),
            ct);
        return HandleResponse(result);
    }
}
