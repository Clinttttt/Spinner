using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Features.Pickups;
using Spinner.Api.Features.Pickups.FailPickup;
using Spinner.Api.Features.Pickups.GetPickupDetails;
using Spinner.Api.Features.Pickups.GetPickupSchedule;
using Spinner.Api.Features.Pickups.MarkPickedUp;
using Spinner.Api.Features.Pickups.ReschedulePickup;

namespace Spinner.Api.Controllers;

[Route("api/pickups")]
[Authorize]
public sealed class PickupsController : ApiControllerBase
{
    public PickupsController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet("today")]
    public async Task<ActionResult<PagedResponse<PickupScheduleItemResponse>>> GetToday(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var result = await Sender.Send(new GetPickupScheduleQuery(today, page, pageSize), ct);
        return HandleResponse(result);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<PickupScheduleItemResponse>>> GetByDate(
        [FromQuery] DateOnly? date,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        CancellationToken ct = default)
    {
        var scheduleDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var result = await Sender.Send(new GetPickupScheduleQuery(scheduleDate, page, pageSize), ct);
        return HandleResponse(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PickupDetailsResponse>> GetDetails(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new GetPickupDetailsQuery(id), ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/picked-up")]
    public async Task<ActionResult<PickupDetailsResponse>> MarkPickedUp(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new MarkPickedUpCommand(id), ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/reschedule")]
    public async Task<ActionResult<PickupDetailsResponse>> Reschedule(
        Guid id,
        [FromBody] ReschedulePickupRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new ReschedulePickupCommand(id, request.PreferredDate, request.PreferredTimeWindow),
            ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/fail")]
    public async Task<ActionResult<PickupDetailsResponse>> Fail(
        Guid id,
        [FromBody] FailPickupRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(new FailPickupCommand(id, request.Reason), ct);
        return HandleResponse(result);
    }
}
