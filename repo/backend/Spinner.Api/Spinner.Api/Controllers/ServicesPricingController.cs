using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Features.ServicesPricing;
using Spinner.Api.Features.ServicesPricing.CreateService;
using Spinner.Api.Features.ServicesPricing.DisableService;
using Spinner.Api.Features.ServicesPricing.GetServices;
using Spinner.Api.Features.ServicesPricing.SetServiceAvailability;
using Spinner.Api.Features.ServicesPricing.UpdatePricing;
using Spinner.Api.Features.ServicesPricing.UpdateService;

namespace Spinner.Api.Controllers;

[Route("api/services-pricing/services")]
[Authorize]
public sealed class ServicesPricingController : ApiControllerBase
{
    public ServicesPricingController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<ServiceResponse>>> GetServices(
        [FromQuery] bool activeOnly = true,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(new GetServicesQuery(activeOnly), ct);
        return HandleResponse(result);
    }

    [HttpPost]
    public async Task<ActionResult<ServiceResponse>> Create(
        [FromBody] CreateServiceRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new CreateServiceCommand(
                request.Name,
                request.Description,
                request.UnitLabel,
                request.BasePrice,
                request.SupportsPickupAndDelivery,
                request.DeliveryFee),
            ct);

        return HandleResponse(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ServiceResponse>> Update(
        Guid id,
        [FromBody] UpdateServiceRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new UpdateServiceCommand(
                id,
                request.Name,
                request.Description,
                request.SupportsPickupAndDelivery),
            ct);

        return HandleResponse(result);
    }

    [HttpPut("{id:guid}/pricing")]
    public async Task<ActionResult<ServiceResponse>> UpdatePricing(
        Guid id,
        [FromBody] UpdatePricingRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new UpdatePricingCommand(
                id,
                request.UnitLabel,
                request.BasePrice,
                request.DeliveryFee),
            ct);

        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/disable")]
    public async Task<ActionResult<ServiceResponse>> Disable(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new DisableServiceCommand(id), ct);
        return HandleResponse(result);
    }

    [HttpPut("{id:guid}/availability")]
    public async Task<ActionResult<ServiceResponse>> SetAvailability(
        Guid id,
        [FromBody] SetServiceAvailabilityRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new SetServiceAvailabilityCommand(id, request.IsActive),
            ct);

        return HandleResponse(result);
    }
}
