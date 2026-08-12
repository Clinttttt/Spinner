using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Transactions;

namespace Spinner.Api.Features.Transactions.CreateManualTransaction;

/// <param name="OccurredAt">
/// When the money moved. Back-dating is deliberate — the owner records yesterday's expense
/// today — but it is bounded by the validator so the ledger cannot be rewritten at will.
/// </param>
/// <param name="RecordedByUserId">
/// Who entered it, taken from the token rather than the request body. A ledger entry that
/// cannot be traced to a person is not much of a ledger, and this one recorded every entry
/// against the literal text "Owner/Staff".
/// </param>
public sealed record CreateManualTransactionCommand(
    TransactionKind Kind,
    decimal Amount,
    string? Note,
    DateTimeOffset OccurredAt,
    Guid? RecordedByUserId) : IRequest<Result<TransactionHistoryResponse>>;
