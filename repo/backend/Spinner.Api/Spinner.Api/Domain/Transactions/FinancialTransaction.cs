namespace Spinner.Api.Domain.Transactions;

public sealed class FinancialTransaction
{
    private FinancialTransaction()
    {
    }

    public FinancialTransaction(
        TransactionKind kind,
        decimal amount,
        string? note,
        DateTimeOffset occurredAt,
        DateTimeOffset now)
    {
        if (kind is not (TransactionKind.ManualIncome or TransactionKind.ManualDeduction))
            throw new ArgumentOutOfRangeException(nameof(kind), "Only manual transaction kinds are stored directly.");

        Id = Guid.NewGuid();
        Kind = kind;
        Amount = amount;
        Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        OccurredAt = occurredAt;
        CreatedAt = now;
    }

    public Guid Id { get; private set; }
    public TransactionKind Kind { get; private set; }
    public decimal Amount { get; private set; }
    public string? Note { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
}
