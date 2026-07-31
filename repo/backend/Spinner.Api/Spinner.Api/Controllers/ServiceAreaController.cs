using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Features.ServiceArea.CheckServiceArea;

namespace Spinner.Api.Controllers;

[Route("api/service-area")]
public sealed class ServiceAreaController : ApiControllerBase
{
    public ServiceAreaController(ISender sender)
        : base(sender)
    {
    }

    /// <summary>
    /// Reports whether a coordinate is inside the pickup area.
    /// </summary>
    /// <remarks>
    /// Anonymous because the customer booking form calls it before a booking
    /// exists. It exposes only the configured radius and a distance, never the
    /// shop's own coordinates.
    /// </remarks>
    [HttpGet("check")]
    [AllowAnonymous]
    public async Task<ActionResult<ServiceAreaCheckResponse>> Check(
        [FromQuery] decimal latitude,
        [FromQuery] decimal longitude,
        CancellationToken ct)
    {
        var result = await Sender.Send(new CheckServiceAreaQuery(latitude, longitude), ct);
        return HandleResponse(result);
    }
}
