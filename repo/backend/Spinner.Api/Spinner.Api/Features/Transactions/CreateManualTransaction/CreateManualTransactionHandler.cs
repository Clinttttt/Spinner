using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.ActivityLogs;
using Spinner.Api.Domain.Transactions;

namespace Spinner.Api.Features.Transactions.CreateManualTransaction;

public sealed class CreateManualTransactionHandler
    : IRequestHandler<CreateManualTransactionCommand, Result<TransactionHistoryResponse>>
{
    private readonly AppDbContext _dbContext;

    public CreateManualTransactionHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<TransactionHistoryResponse>> Handle(
        CreateManualTransactionCommand request,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var transaction = new FinancialTransaction(
            request.Kind,
            request.Amount,
            request.Note,
            request.OccurredAt,
            now);

        _dbContext.FinancialTransactions.Add(transaction);

        // Attributed to whoever's token this was, rather than the literal "Owner/Staff"
        // that every entry used to carry. A money movement that cannot be traced to a
        // person is the one thing an audit trail has to get right.
        var actor = request.RecordedByUserId is { } userId
            ? userId.ToString()
            : "Unknown";

        _dbContext.ActivityLogEntries.Add(new ActivityLogEntry(
            actor,
            "ManualTransactionCreated",
            nameof(FinancialTransaction),
            transaction.Id,
            $"{request.Kind} transaction for {request.Amount:0.00} was recorded.",
            now));
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<TransactionHistoryResponse>.Created(new TransactionHistoryResponse(
            transaction.Id,
            transaction.Kind,
            transaction.Kind == TransactionKind.ManualIncome ? "Income" : "Deduction",
            transaction.Amount,
            transaction.Note,
            transaction.OccurredAt,
            null,
            null,
            null));
    }
}
