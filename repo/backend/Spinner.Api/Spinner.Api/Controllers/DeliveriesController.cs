using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Features.Deliveries;
using Spinner.Api.Features.Deliveries.FailDelivery;
using Spinner.Api.Features.Deliveries.GetDeliveryDetails;
using Spinner.Api.Features.Deliveries.GetDeliverySchedule;
using Spinner.Api.Features.Deliveries.MarkDelivered;
using Spinner.Api.Features.Deliveries.MarkOutForDelivery;

namespace Spinner.Api.Controllers;

[Route("api/deliveries")]
[Authorize]
public sealed class DeliveriesController : ApiControllerBase
{
    public DeliveriesController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet("today")]
    public async Task<ActionResult<IReadOnlyList<DeliveryScheduleItemResponse>>> GetToday(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var result = await Sender.Send(new GetDeliveryScheduleQuery(today), ct);
        return HandleResponse(result);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DeliveryScheduleItemResponse>>> GetByDate(
        [FromQuery] DateOnly? date,
        CancellationToken ct)
    {
        var scheduleDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var result = await Sender.Send(new GetDeliveryScheduleQuery(scheduleDate), ct);
        return HandleResponse(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DeliveryDetailsResponse>> GetDetails(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new GetDeliveryDetailsQuery(id), ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/out-for-delivery")]
    public async Task<ActionResult<DeliveryDetailsResponse>> MarkOutForDelivery(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new MarkOutForDeliveryCommand(id), ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/delivered")]
    public async Task<ActionResult<DeliveryDetailsResponse>> MarkDelivered(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new MarkDeliveredCommand(id), ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/fail")]
    public async Task<ActionResult<DeliveryDetailsResponse>> Fail(
        Guid id,
        [FromBody] FailDeliveryRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(new FailDeliveryCommand(id, request.Reason), ct);
        return HandleResponse(result);
    }
}
