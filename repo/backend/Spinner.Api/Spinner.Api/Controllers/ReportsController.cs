using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Features.Reports.ExportOrderHistory;
using Spinner.Api.Features.Reports.GetDailySalesReport;
using Spinner.Api.Features.Reports.GetOrderHistory;

namespace Spinner.Api.Controllers;

[Route("api/reports")]
[Authorize]
public sealed class ReportsController : ApiControllerBase
{
    public ReportsController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet("daily-sales")]
    public async Task<ActionResult<DailySalesReportResponse>> GetDailySales(
        [FromQuery] DateOnly? date,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(
            new GetDailySalesReportQuery(date ?? DateOnly.FromDateTime(DateTime.UtcNow.Date)),
            ct);

        return HandleResponse(result);
    }

    [HttpGet("order-history")]
    public async Task<ActionResult<PagedResponse<OrderHistoryItemResponse>>> GetOrderHistory(
        [FromQuery] string? search,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(new GetOrderHistoryQuery(search, from, to, page, pageSize), ct);
        return HandleResponse(result);
    }

    [HttpGet("order-history/export")]
    public async Task<ActionResult<OrderHistoryExportResponse>> ExportOrderHistory(
        [FromQuery] string? search,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct)
    {
        var result = await Sender.Send(new ExportOrderHistoryQuery(search, from, to), ct);
        return HandleResponse(result);
    }
}
