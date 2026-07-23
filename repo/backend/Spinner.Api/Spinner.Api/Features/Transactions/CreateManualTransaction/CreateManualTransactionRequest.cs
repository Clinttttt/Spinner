using Spinner.Api.Domain.Transactions;

namespace Spinner.Api.Features.Transactions.CreateManualTransaction;

public sealed record CreateManualTransactionRequest(
    TransactionKind Kind,
    decimal Amount,
    string? Note,
    DateTimeOffset OccurredAt);
