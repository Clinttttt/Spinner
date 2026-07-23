using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Features.Orders;
using Spinner.Api.Features.Orders.GetCustomerTracking;
using Spinner.Api.Features.Orders.GetOrderDetails;
using Spinner.Api.Features.Orders.UpdateOrderStatus;

namespace Spinner.Api.Controllers;

[Route("api/orders")]
[Authorize]
public sealed class OrdersController : ApiControllerBase
{
    public OrdersController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDetailsResponse>> GetDetails(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new GetOrderDetailsQuery(id), ct);
        return HandleResponse(result);
    }

    [HttpGet("track/{trackingCode}")]
    [AllowAnonymous]
    public async Task<ActionResult<CustomerTrackingResponse>> Track(string trackingCode, CancellationToken ct)
    {
        var result = await Sender.Send(new GetCustomerTrackingQuery(trackingCode), ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/status")]
    public async Task<ActionResult<OrderDetailsResponse>> UpdateStatus(
        Guid id,
        [FromBody] UpdateOrderStatusRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(new UpdateOrderStatusCommand(id, request.Status), ct);
        return HandleResponse(result);
    }
}
