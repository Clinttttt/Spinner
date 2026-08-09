using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Security;
using Spinner.Api.Features.Notifications.GetNotificationHistory;
using Spinner.Api.Features.Notifications.ResendNotification;

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

    /// <summary>
    /// Tries a notification again after it gave up.
    /// </summary>
    /// <remarks>
    /// Owner only. Deciding to contact a customer again is the owner's call, and the
    /// message may carry a receipt or a payment reference.
    /// </remarks>
    [HttpPost("{notificationId:guid}/resend")]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    public async Task<ActionResult> Resend(Guid notificationId, CancellationToken ct)
    {
        var result = await Sender.Send(new ResendNotificationCommand(notificationId), ct);
        return HandleResponse(result);
    }
}
