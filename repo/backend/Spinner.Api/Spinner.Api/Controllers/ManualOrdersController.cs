using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.ManualOrders.CreateManualOrder;
using Spinner.Api.Features.ManualOrders.GetManualOrders;
using Spinner.Api.Features.ManualOrders.GetManualOrderDetails;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Controllers;

[Route("api/manual-orders")]
[Authorize]
public sealed class ManualOrdersController : ApiControllerBase
{
    public ManualOrdersController(ISender sender)
        : base(sender)
    {
    }

    [HttpPost]
    public async Task<ActionResult<OrderDetailsResponse>> Create(
        [FromBody] CreateManualOrderRequest request,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(new CreateManualOrderCommand(
            request.CustomerName,
            request.MobileNumber,
            request.EmailAddress,
            request.Method,
            request.Address,
            request.ScheduledDate,
            request.ScheduledTime,
            request.PaymentMethod,
            request.Services,
            request.AdditionalCharge,
            request.AdditionalChargeReason,
            request.Discount,
            request.DiscountReason,
            request.Notes,
            request.SpecialInstructions,
            request.PreferredNotificationChannel,
            request.PickupLocation,
            request.AllowDuplicate), ct);

        return HandleCreatedResponse(result, nameof(GetById), new { id = result.Value?.OrderId });
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<ManualOrderListItemResponse>>> GetList(
        [FromQuery] string? search,
        [FromQuery] FulfillmentType? method,
        [FromQuery] OrderStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        [FromQuery] bool includeCleared = false,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(
            new GetManualOrdersQuery(search, method, status, page, pageSize, includeCleared),
            ct);
        return HandleResponse(result);
    }

    [HttpGet("{id:guid}", Name = nameof(GetById))]
    public async Task<ActionResult<OrderDetailsResponse>> GetById(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new GetManualOrderDetailsQuery(id), ct);
        return HandleResponse(result);
    }
}
