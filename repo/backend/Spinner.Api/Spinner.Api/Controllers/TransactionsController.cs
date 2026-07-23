using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Domain.Transactions;
using Spinner.Api.Features.Transactions;
using Spinner.Api.Features.Transactions.CreateManualTransaction;
using Spinner.Api.Features.Transactions.GetTransactionHistory;

namespace Spinner.Api.Controllers;

[Route("api/transactions")]
[Authorize]
public sealed class TransactionsController : ApiControllerBase
{
    public TransactionsController(ISender sender)
        : base(sender)
    {
    }

    [HttpPost]
    public async Task<ActionResult<TransactionHistoryResponse>> Create(
        [FromBody] CreateManualTransactionRequest request,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(new CreateManualTransactionCommand(
            request.Kind,
            request.Amount,
            request.Note,
            request.OccurredAt), ct);

        return HandleResponse(result);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<TransactionHistoryResponse>>> GetHistory(
        [FromQuery] string? search,
        [FromQuery] TransactionKind? kind,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] TransactionSort sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(
            new GetTransactionHistoryQuery(search, kind, from, to, sort, page, pageSize),
            ct);
        return HandleResponse(result);
    }
}
