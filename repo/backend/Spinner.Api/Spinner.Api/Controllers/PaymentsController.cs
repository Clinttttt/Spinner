using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Features.Payments;
using Spinner.Api.Features.Payments.CalculateOrderTotal;
using Spinner.Api.Features.Payments.ConfirmCodPayment;
using Spinner.Api.Features.Payments.CreateOnlinePaymentLink;
using Spinner.Api.Features.Payments.GetOnlinePaymentStatus;
using Spinner.Api.Features.Payments.HandleOnlinePaymentWebhook;

namespace Spinner.Api.Controllers;

[Route("api/payments")]
[Authorize]
public sealed class PaymentsController : ApiControllerBase
{
    public PaymentsController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet("{orderId:guid}/total")]
    public async Task<ActionResult<OrderTotalResponse>> GetTotal(Guid orderId, CancellationToken ct)
    {
        var result = await Sender.Send(new CalculateOrderTotalQuery(orderId), ct);
        return HandleResponse(result);
    }

    [HttpPost("{orderId:guid}/cod/confirm")]
    public async Task<ActionResult<PaymentConfirmationResponse>> ConfirmCod(Guid orderId, CancellationToken ct)
    {
        var result = await Sender.Send(new ConfirmCodPaymentCommand(orderId), ct);
        return HandleResponse(result);
    }

    [HttpPost("{orderId:guid}/online/link")]
    public async Task<ActionResult<OnlinePaymentLinkResponse>> CreateOnlinePaymentLink(
        Guid orderId,
        CancellationToken ct)
    {
        var result = await Sender.Send(new CreateOnlinePaymentLinkCommand(orderId), ct);
        return HandleResponse(result);
    }

    [HttpGet("online/{paymentReference}/status")]
    [AllowAnonymous]
    public async Task<ActionResult<OnlinePaymentStatusResponse>> GetOnlinePaymentStatus(
        string paymentReference,
        CancellationToken ct)
    {
        var result = await Sender.Send(new GetOnlinePaymentStatusQuery(paymentReference), ct);
        return HandleResponse(result);
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<ActionResult<OnlinePaymentWebhookResponse>> HandleWebhook(
        [FromBody] OnlinePaymentWebhookRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new HandleOnlinePaymentWebhookCommand(
                request.PaymentReference,
                request.Amount,
                request.Status,
                request.Signature),
            ct);

        return HandleResponse(result);
    }
}
