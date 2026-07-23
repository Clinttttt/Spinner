using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Features.ActivityLogs.GetActivityLogs;

namespace Spinner.Api.Controllers;

[Route("api/activity-logs")]
[Authorize]
public sealed class ActivityLogsController : ApiControllerBase
{
    public ActivityLogsController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<ActivityLogResponse>>> GetActivityLogs(
        [FromQuery] Guid? entityId,
        [FromQuery] string? action,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(
            new GetActivityLogsQuery(entityId, action, page, pageSize),
            ct);
        return HandleResponse(result);
    }
}
