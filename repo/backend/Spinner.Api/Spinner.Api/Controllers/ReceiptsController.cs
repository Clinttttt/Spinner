using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Features.Receipts;
using Spinner.Api.Features.Receipts.CreatePaymentInstructionMessage;
using Spinner.Api.Features.Receipts.GetReceipt;
using Spinner.Api.Features.Receipts.ResendReceipt;
using Spinner.Api.Features.Receipts.SendReceipt;

namespace Spinner.Api.Controllers;

[Route("api/receipts")]
[Authorize]
public sealed class ReceiptsController : ApiControllerBase
{
    public ReceiptsController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet("{receiptCode}")]
    [AllowAnonymous]
    public async Task<ActionResult<ReceiptResponse>> Get(string receiptCode, CancellationToken ct)
    {
        var result = await Sender.Send(new GetReceiptQuery(receiptCode), ct);
        return HandleResponse(result);
    }

    [HttpPost("{orderId:guid}/send")]
    public async Task<ActionResult<ReceiptNotificationResponse>> Send(Guid orderId, CancellationToken ct)
    {
        var result = await Sender.Send(new SendReceiptCommand(orderId), ct);
        return HandleResponse(result);
    }

    [HttpPost("{orderId:guid}/resend")]
    public async Task<ActionResult<ReceiptNotificationResponse>> Resend(Guid orderId, CancellationToken ct)
    {
        var result = await Sender.Send(new ResendReceiptCommand(orderId), ct);
        return HandleResponse(result);
    }

    [HttpGet("{orderId:guid}/payment-instructions")]
    public async Task<ActionResult<PaymentInstructionResponse>> PaymentInstructions(
        Guid orderId,
        CancellationToken ct)
    {
        var result = await Sender.Send(new CreatePaymentInstructionMessageQuery(orderId), ct);
        return HandleResponse(result);
    }
}
