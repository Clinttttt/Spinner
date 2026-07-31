using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Time;
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
    private readonly IBusinessClock _clock;

    public PickupsController(ISender sender, IBusinessClock clock)
        : base(sender)
    {
        _clock = clock;
    }

    [HttpGet("today")]
    public async Task<ActionResult<PagedResponse<PickupScheduleItemResponse>>> GetToday(
        [FromQuery] bool includeCollected = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(
            new GetPickupScheduleQuery(_clock.Today, includeCollected, page, pageSize),
            ct);
        return HandleResponse(result);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<PickupScheduleItemResponse>>> GetByDate(
        [FromQuery] DateOnly? date,
        [FromQuery] bool includeCollected = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        CancellationToken ct = default)
    {
        var scheduleDate = date ?? _clock.Today;
        var result = await Sender.Send(
            new GetPickupScheduleQuery(scheduleDate, includeCollected, page, pageSize),
            ct);
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
