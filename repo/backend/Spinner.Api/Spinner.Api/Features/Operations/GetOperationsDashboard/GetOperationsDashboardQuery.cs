using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Operations.GetOperationsDashboard;

public sealed record GetOperationsDashboardQuery : IRequest<Result<OperationsDashboardResponse>>;
