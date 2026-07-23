using Spinner.Api.Domain.Transactions;

namespace Spinner.Api.Features.Transactions;

public sealed record TransactionHistoryResponse(
    Guid Id,
    TransactionKind Kind,
    string Title,
    decimal Amount,
    string? Note,
    DateTimeOffset OccurredAt,
    Guid? SourceId,
    string? OrderCode,
    string? ServiceLabel);

public enum TransactionSort
{
    Latest,
    Oldest,
    Highest,
    Lowest
}
