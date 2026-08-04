using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Time;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Transactions;

namespace Spinner.Api.Features.Transactions.GetTransactionHistory;

public sealed class GetTransactionHistoryHandler
    : IRequestHandler<GetTransactionHistoryQuery, Result<PagedResponse<TransactionHistoryResponse>>>
{
    private readonly AppDbContext _dbContext;
    private readonly IBusinessClock _businessClock;

    public GetTransactionHistoryHandler(AppDbContext dbContext, IBusinessClock businessClock)
    {
        _dbContext = dbContext;
        _businessClock = businessClock;
    }

    public async Task<Result<PagedResponse<TransactionHistoryResponse>>> Handle(
        GetTransactionHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var stored = await _dbContext.FinancialTransactions
            .AsNoTracking()
            .ToListAsync(cancellationToken);
        var paidOrders = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.ServiceItems)
            .Where(order => order.PaymentStatus == PaymentStatus.Paid && order.PaidAt != null)
            .ToListAsync(cancellationToken);

        IEnumerable<TransactionHistoryResponse> rows = stored.Select(transaction => new TransactionHistoryResponse(
            transaction.Id,
            transaction.Kind,
            transaction.Kind == TransactionKind.ManualIncome ? "Income" : "Deduction",
            transaction.Amount,
            transaction.Note,
            transaction.OccurredAt,
            null,
            null,
            null)).Concat(paidOrders.Select(order => new TransactionHistoryResponse(
                order.Id,
                order.Source == OrderSource.CustomerWeb
                    ? TransactionKind.BookingSale
                    : TransactionKind.ManualOrderSale,
                order.Source == OrderSource.CustomerWeb ? "Booking Sale" : "Manual Order Sale",
                order.EstimatedTotalAmount,
                null,
                order.PaidAt!.Value,
                order.Id,
                order.OrderCode,
                order.ServiceItems.Count > 0
                    ? string.Join(", ", order.ServiceItems.Select(item => item.ServiceName))
                    : order.ServiceName)));

        if (request.Kind is not null)
            rows = rows.Where(row => row.Kind == request.Kind);

        // Filtered in the shop's own time, not UTC. The shop is UTC+8, so a payment
        // taken at 00:30 local is stored as 16:30Z the previous day; comparing the
        // stored instant's UTC date filed the whole early-morning shift under
        // yesterday, and a day's takings never matched what the owner had counted.
        if (request.From is not null)
            rows = rows.Where(row => _businessClock.ToBusinessDate(row.OccurredAt) >= request.From.Value);

        if (request.To is not null)
            rows = rows.Where(row => _businessClock.ToBusinessDate(row.OccurredAt) <= request.To.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            rows = rows.Where(row =>
                row.Title.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (row.Note?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (row.OrderCode?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false) ||
                row.Amount.ToString("0.00").Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        rows = request.Sort switch
        {
            TransactionSort.Oldest => rows.OrderBy(row => row.OccurredAt),
            TransactionSort.Highest => rows.OrderByDescending(row => row.Amount),
            TransactionSort.Lowest => rows.OrderBy(row => row.Amount),
            _ => rows.OrderByDescending(row => row.OccurredAt)
        };

        var page = PageRequest.NormalizePage(request.Page);
        var pageSize = PageRequest.NormalizePageSize(request.PageSize);
        var materializedRows = rows.ToList();
        var pageItems = materializedRows
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Result<PagedResponse<TransactionHistoryResponse>>.Success(
            PagedResponse<TransactionHistoryResponse>.Create(
                pageItems,
                page,
                pageSize,
                materializedRows.Count));
    }
}
