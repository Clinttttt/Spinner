using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Time;
using Spinner.Api.Database;
using Spinner.Api.Features.Reports.GetOrderHistory;

namespace Spinner.Api.Features.Reports.ExportOrderHistory;

/// <summary>
/// Builds a CSV of order history for the owner's records.
/// </summary>
/// <remarks>
/// Bounded in two ways, because this used to read the whole orders table with no
/// limit at all: as the shop's history grows that is a query that gets slower every
/// month and a response that gets larger every month, and one impatient double-click
/// could hold two copies of it in memory at once.
///
/// The bound is a date range rather than a silent row cap. Truncating an accounting
/// export without saying so is worse than refusing it, so an over-wide range is
/// turned down with an explanation and the row cap only exists as a backstop that
/// reports itself.
/// </remarks>
public sealed class ExportOrderHistoryHandler
    : IRequestHandler<ExportOrderHistoryQuery, Result<OrderHistoryExportResponse>>
{
    /// <summary>Widest range accepted in one export.</summary>
    internal const int MaximumDays = 366;

    /// <summary>Used when the caller does not ask for a range.</summary>
    internal const int DefaultDays = 90;

    /// <summary>Backstop against an unexpectedly dense range.</summary>
    internal const int MaximumRows = 20_000;

    private readonly AppDbContext _dbContext;
    private readonly IBusinessClock _businessClock;

    public ExportOrderHistoryHandler(AppDbContext dbContext, IBusinessClock businessClock)
    {
        _dbContext = dbContext;
        _businessClock = businessClock;
    }

    public async Task<Result<OrderHistoryExportResponse>> Handle(
        ExportOrderHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var range = ResolveRange(request);
        if (!range.IsSuccess)
            return Result<OrderHistoryExportResponse>.Validation(range.Error.Message);

        var (from, to) = range.Value;

        var query = _dbContext.LaundryOrders
            .AsNoTracking()
            .Where(order => order.PreferredDate >= from && order.PreferredDate <= to);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();

            query = query.Where(order =>
                order.OrderCode.ToLower().Contains(search) ||
                order.TrackingCode.ToLower().Contains(search) ||
                order.ContactName.ToLower().Contains(search) ||
                order.Customer.MobileNumber.ToLower().Contains(search));
        }

        // One more than the cap, so a full result set can be told apart from one that
        // was cut short without counting the whole table separately.
        var rows = await query
            .OrderByDescending(order => order.PreferredDate)
            .ThenByDescending(order => order.CreatedAt)
            .Take(MaximumRows + 1)
            .Select(order => new OrderHistoryItemResponse(
                order.Id,
                order.OrderCode,
                order.Source,
                order.ContactName,
                order.Customer.MobileNumber,
                order.ServiceName,
                order.PreferredDate,
                order.PreferredTimeWindow,
                order.FulfillmentType,
                order.PaymentMethod,
                order.PaymentStatus,
                order.Status,
                order.EstimatedTotalAmount,
                order.CreatedAt,
                order.UpdatedAt))
            .ToListAsync(cancellationToken);

        var truncated = rows.Count > MaximumRows;
        if (truncated)
            rows.RemoveAt(rows.Count - 1);

        return Result<OrderHistoryExportResponse>.Success(new OrderHistoryExportResponse(
            $"order-history-{from:yyyyMMdd}-{to:yyyyMMdd}.csv",
            "text/csv",
            BuildCsv(rows),
            rows.Count,
            truncated,
            truncated
                ? $"Only the most recent {MaximumRows:N0} orders are included. Export a shorter date range to get the rest."
                : null));
    }

    /// <summary>
    /// Works out which dates to export, and refuses a range that is too wide.
    /// </summary>
    private Result<(DateOnly From, DateOnly To)> ResolveRange(ExportOrderHistoryQuery request)
    {
        var today = _businessClock.Today;

        // A missing bound means "as far back as needed", which is exactly the
        // unbounded read being removed, so each one gets a concrete default instead.
        var to = request.To ?? today;
        var from = request.From ?? to.AddDays(-DefaultDays);

        if (from > to)
        {
            return Result<(DateOnly, DateOnly)>.Validation(
                "The start of the range is after the end of it.");
        }

        var days = to.DayNumber - from.DayNumber + 1;

        if (days > MaximumDays)
        {
            return Result<(DateOnly, DateOnly)>.Validation(
                $"Export up to {MaximumDays} days at a time. This range covers {days:N0} days, " +
                "so please export it in shorter periods.");
        }

        return Result<(DateOnly, DateOnly)>.Success((from, to));
    }

    private static string BuildCsv(IReadOnlyList<OrderHistoryItemResponse> orders)
    {
        // Sized up front from the row count, so the buffer is not repeatedly copied
        // as it grows.
        var csv = new StringBuilder(128 + (orders.Count * 160));

        csv.AppendLine(
            "Order Code,Source,Customer,Mobile,Service,Preferred Date,Time Window," +
            "Fulfillment,Payment Method,Payment Status,Order Status,Total Amount");

        foreach (var order in orders)
        {
            csv.AppendLine(string.Join(',', new[]
            {
                Escape(order.OrderCode),
                Escape(order.Source.ToString()),
                Escape(order.CustomerName),
                Escape(order.MobileNumber),
                Escape(order.ServiceName),
                Escape(order.PreferredDate.ToString("yyyy-MM-dd")),
                Escape(order.PreferredTimeWindow),
                Escape(order.FulfillmentType.ToString()),
                Escape(order.PaymentMethod.ToString()),
                Escape(order.PaymentStatus.ToString()),
                Escape(order.Status.ToString()),
                Escape(order.TotalAmount.ToString("0.00"))
            }));
        }

        return csv.ToString();
    }

    private static string Escape(string value)
    {
        // A leading =, +, - or @ makes a spreadsheet treat the cell as a formula, so a
        // customer name typed as "=cmd" would execute on open. Prefixed with a quote
        // to keep it text.
        var safe = value.Length > 0 && value[0] is '=' or '+' or '-' or '@'
            ? "'" + value
            : value;

        if (!safe.Contains(',') && !safe.Contains('"') && !safe.Contains('\n') && !safe.Contains('\r'))
            return safe;

        return $"\"{safe.Replace("\"", "\"\"")}\"";
    }
}
