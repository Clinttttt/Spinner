namespace Spinner.Api.Features.Reports.ExportOrderHistory;

public sealed record OrderHistoryExportResponse(
    string FileName,
    string ContentType,
    string Content,
    int RowCount,
    /// <summary>
    /// Whether rows were left out because the range was unexpectedly dense.
    /// </summary>
    /// <remarks>
    /// Reported rather than silent: an accounting export that quietly drops rows is
    /// worse than one that refuses.
    /// </remarks>
    bool IsTruncated = false,
    string? Notice = null);
