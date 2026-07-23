using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Reports.GetDailySalesReport;

public sealed record GetDailySalesReportQuery(DateOnly Date) : IRequest<Result<DailySalesReportResponse>>;
