using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Transactions;

namespace Spinner.Api.Features.Transactions.CreateManualTransaction;

public sealed record CreateManualTransactionCommand(
    TransactionKind Kind,
    decimal Amount,
    string? Note,
    DateTimeOffset OccurredAt) : IRequest<Result<TransactionHistoryResponse>>;
