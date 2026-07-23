using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Features.Operations.GetNewBookingRequests;
using Spinner.Api.Features.Operations.GetOperationsDashboard;

namespace Spinner.Api.Controllers;

[Route("api/operations")]
[Authorize]
public sealed class OperationsController : ApiControllerBase
{
    public OperationsController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<OperationsDashboardResponse>> GetDashboard(CancellationToken ct)
    {
        var result = await Sender.Send(new GetOperationsDashboardQuery(), ct);
        return HandleResponse(result);
    }

    [HttpGet("new-bookings")]
    public async Task<ActionResult<IReadOnlyList<NewBookingRequestResponse>>> GetNewBookings(CancellationToken ct)
    {
        var result = await Sender.Send(new GetNewBookingRequestsQuery(), ct);
        return HandleResponse(result);
    }
}
