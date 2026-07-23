using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Features.LaundryStatusBoard;
using Spinner.Api.Features.LaundryStatusBoard.GetLaundryStatusBoard;
using Spinner.Api.Features.LaundryStatusBoard.MarkBeingProcessed;
using Spinner.Api.Features.LaundryStatusBoard.MarkReadyForDelivery;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Controllers;

[Route("api/laundry-status-board")]
[Authorize]
public sealed class LaundryStatusBoardController : ApiControllerBase
{
    public LaundryStatusBoardController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet]
    public async Task<ActionResult<LaundryStatusBoardResponse>> Get(CancellationToken ct)
    {
        var result = await Sender.Send(new GetLaundryStatusBoardQuery(), ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/being-processed")]
    public async Task<ActionResult<OrderDetailsResponse>> MarkBeingProcessed(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new MarkBeingProcessedCommand(id), ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/ready-for-delivery")]
    public async Task<ActionResult<OrderDetailsResponse>> MarkReadyForDelivery(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new MarkReadyForDeliveryCommand(id), ct);
        return HandleResponse(result);
    }
}
