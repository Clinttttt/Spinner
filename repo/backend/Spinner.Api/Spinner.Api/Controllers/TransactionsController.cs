using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Transactions;
using Spinner.Api.Features.Transactions;
using Spinner.Api.Features.Transactions.CreateManualTransaction;
using Spinner.Api.Features.Transactions.GetTransactionHistory;

namespace Spinner.Api.Controllers;

[Route("api/transactions")]
// Owner only. This is the shop's money: the running ledger of what came in and went out, and
// the ability to add an entry to it. Staff run the day's work and handle cash on orders, which
// is recorded against the order itself; the books are the owner's.
//
// It was previously a bare [Authorize], so any staff account could read every figure and post
// arbitrary income or expenses.
[Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
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
        // Taken from the token, never from the body, so the entry cannot be attributed to
        // someone else.
        var recordedBy = TryGetCurrentUserId(out var userId) ? userId : (Guid?)null;

        var result = await Sender.Send(new CreateManualTransactionCommand(
            request.Kind,
            request.Amount,
            request.Note,
            request.OccurredAt,
            recordedBy), ct);

        return HandleResponse(result);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<TransactionHistoryResponse>>> GetHistory(
        [FromQuery] string? search,
        [FromQuery] TransactionKind? kind,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] TransactionSort sort,
        [FromQuery] TransactionDirection? direction,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(
            new GetTransactionHistoryQuery(search, kind, from, to, sort, page, pageSize, direction),
            ct);
        return HandleResponse(result);
    }
}
