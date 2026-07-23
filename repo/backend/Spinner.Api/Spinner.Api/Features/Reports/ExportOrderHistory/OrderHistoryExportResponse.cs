namespace Spinner.Api.Features.Reports.ExportOrderHistory;

public sealed record OrderHistoryExportResponse(
    string FileName,
    string ContentType,
    string Content,
    int RowCount);
