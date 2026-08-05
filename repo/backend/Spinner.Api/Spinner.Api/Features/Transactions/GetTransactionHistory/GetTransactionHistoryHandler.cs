using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Time;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Transactions;

namespace Spinner.Api.Features.Transactions.GetTransactionHistory;

/// <summary>
/// The shop's money movements: manual income and deductions, plus every paid order.
/// </summary>
/// <remarks>
/// Filtered, sorted and paged in the database. It previously read every financial
/// transaction and every paid order — with their service items — into memory on each
/// request, then did all of that with LINQ, so showing the owner twenty rows meant
/// loading the shop's entire trading history. That cost grows every month and is
/// paid again on every keystroke of the search box.
/// </remarks>
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
        var rows = BuildQuery(request);

        var page = PageRequest.NormalizePage(request.Page);
        var pageSize = PageRequest.NormalizePageSize(request.PageSize);

        var totalCount = await rows.CountAsync(cancellationToken);

        var pageRows = await Sort(rows, request.Sort)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = await DescribeAsync(pageRows, cancellationToken);

        return Result<PagedResponse<TransactionHistoryResponse>>.Success(
            PagedResponse<TransactionHistoryResponse>.Create(items, page, pageSize, totalCount));
    }

    /// <summary>
    /// The two sources of money movement, as one query.
    /// </summary>
    /// <remarks>
    /// Both sides project to the same shape so they can be combined into a single SQL
    /// union, which is what allows the database to do the counting and paging. The
    /// display title and service summary are left out here because neither is stored:
    /// they are worked out once, for the page actually being returned.
    /// </remarks>
    private IQueryable<TransactionRow> BuildQuery(GetTransactionHistoryQuery request)
    {
        var manual = _dbContext.FinancialTransactions
            .AsNoTracking()
            .Select(transaction => new TransactionRow
            {
                Id = transaction.Id,
                Kind = transaction.Kind,
                Amount = transaction.Amount,
                Note = transaction.Note,
                OccurredAt = transaction.OccurredAt,
                OrderId = null,
                OrderCode = null,
                ServiceName = null,
            });

        var sales = _dbContext.LaundryOrders
            .AsNoTracking()
            .Where(order => order.PaymentStatus == PaymentStatus.Paid && order.PaidAt != null)
            .Select(order => new TransactionRow
            {
                Id = order.Id,
                Kind = order.Source == OrderSource.CustomerWeb
                    ? TransactionKind.BookingSale
                    : TransactionKind.ManualOrderSale,
                Amount = order.EstimatedTotalAmount,
                Note = null,
                OccurredAt = order.PaidAt!.Value,
                OrderId = order.Id,
                OrderCode = order.OrderCode,
                ServiceName = order.ServiceName,
            });

        var rows = manual.Concat(sales);

        if (request.Kind is not null)
            rows = rows.Where(row => row.Kind == request.Kind);

        // Money in is everything that is not a deduction, which is how the owner's own
        // Income filter reads. Resolved here so the database can apply it.
        if (request.Direction == TransactionDirection.In)
            rows = rows.Where(row => row.Kind != TransactionKind.ManualDeduction);

        if (request.Direction == TransactionDirection.Out)
            rows = rows.Where(row => row.Kind == TransactionKind.ManualDeduction);

        // The stored value is an instant; the filter is a local calendar day. The day's
        // boundaries are converted to instants once, here, so the comparison can happen
        // in SQL. Comparing the instant's UTC date instead — which is what this used to
        // do — filed the whole 00:00 to 08:00 local shift under the previous day.
        if (request.From is not null)
        {
            var from = _businessClock.StartOfBusinessDay(request.From.Value);
            rows = rows.Where(row => row.OccurredAt >= from);
        }

        if (request.To is not null)
        {
            var to = _businessClock.EndOfBusinessDay(request.To.Value);
            rows = rows.Where(row => row.OccurredAt < to);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
            rows = ApplySearch(rows, request.Search.Trim());

        return rows;
    }

    /// <summary>
    /// Matches the search against everything the owner can see on a row.
    /// </summary>
    /// <remarks>
    /// The row's title is derived from its kind rather than stored, so searching for
    /// "booking" is resolved to the kinds whose titles match and applied as a filter on
    /// kind. The amount is matched numerically for the same reason: formatting it as
    /// text is not something the database can do on our behalf.
    /// </remarks>
    private static IQueryable<TransactionRow> ApplySearch(
        IQueryable<TransactionRow> rows,
        string search)
    {
        var lowered = search.ToLowerInvariant();

        var matchingKinds = Enum.GetValues<TransactionKind>()
            .Where(kind => TitleFor(kind).Contains(lowered, StringComparison.OrdinalIgnoreCase))
            .ToArray();

        var amount = decimal.TryParse(search, out var parsed) ? parsed : (decimal?)null;

        return rows.Where(row =>
            (row.Note != null && row.Note.ToLower().Contains(lowered)) ||
            (row.OrderCode != null && row.OrderCode.ToLower().Contains(lowered)) ||
            (row.ServiceName != null && row.ServiceName.ToLower().Contains(lowered)) ||
            matchingKinds.Contains(row.Kind) ||
            (amount != null && row.Amount == amount));
    }

    private static IQueryable<TransactionRow> Sort(
        IQueryable<TransactionRow> rows,
        TransactionSort? sort) =>
        sort switch
        {
            // Tie-broken by id so paging cannot show the same row twice, or skip one,
            // when several share a timestamp or amount. Without a total order the
            // database is free to return ties differently on each page.
            TransactionSort.Oldest => rows.OrderBy(row => row.OccurredAt).ThenBy(row => row.Id),
            TransactionSort.Highest => rows.OrderByDescending(row => row.Amount).ThenBy(row => row.Id),
            TransactionSort.Lowest => rows.OrderBy(row => row.Amount).ThenBy(row => row.Id),
            _ => rows.OrderByDescending(row => row.OccurredAt).ThenBy(row => row.Id)
        };

    /// <summary>
    /// Fills in the parts that are not stored, for one page of rows.
    /// </summary>
    private async Task<List<TransactionHistoryResponse>> DescribeAsync(
        List<TransactionRow> rows,
        CancellationToken cancellationToken)
    {
        // An order can have several services, and the summary joins their names. Loaded
        // for this page only, rather than by including every order's items in the main
        // query as before.
        var orderIds = rows
            .Where(row => row.OrderId is not null)
            .Select(row => row.OrderId!.Value)
            .Distinct()
            .ToList();

        var serviceNames = orderIds.Count == 0
            ? []
            : await _dbContext.OrderServiceItems
                .AsNoTracking()
                .Where(item => orderIds.Contains(item.OrderId))
                .OrderBy(item => item.ServiceName)
                .Select(item => new { item.OrderId, item.ServiceName })
                .ToListAsync(cancellationToken);

        var byOrder = serviceNames
            .GroupBy(item => item.OrderId)
            .ToDictionary(
                group => group.Key,
                group => string.Join(", ", group.Select(item => item.ServiceName)));

        return rows
            .Select(row => new TransactionHistoryResponse(
                row.Id,
                row.Kind,
                TitleFor(row.Kind),
                row.Amount,
                row.Note,
                row.OccurredAt,
                row.OrderId,
                row.OrderCode,
                row.OrderId is not null && byOrder.TryGetValue(row.OrderId.Value, out var joined)
                    ? joined
                    : row.ServiceName))
            .ToList();
    }

    private static string TitleFor(TransactionKind kind) => kind switch
    {
        TransactionKind.BookingSale => "Booking Sale",
        TransactionKind.ManualOrderSale => "Manual Order Sale",
        TransactionKind.ManualIncome => "Income",
        _ => "Deduction"
    };

    /// <summary>
    /// The shared shape both sources project to so they can be unioned in SQL.
    /// </summary>
    private sealed class TransactionRow
    {
        public Guid Id { get; init; }
        public TransactionKind Kind { get; init; }
        public decimal Amount { get; init; }
        public string? Note { get; init; }
        public DateTimeOffset OccurredAt { get; init; }
        public Guid? OrderId { get; init; }
        public string? OrderCode { get; init; }
        public string? ServiceName { get; init; }
    }
}
