using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Reports.ExportOrderHistory;

public sealed record ExportOrderHistoryQuery(
    string? Search,
    DateOnly? From,
    DateOnly? To) : IRequest<Result<OrderHistoryExportResponse>>;
