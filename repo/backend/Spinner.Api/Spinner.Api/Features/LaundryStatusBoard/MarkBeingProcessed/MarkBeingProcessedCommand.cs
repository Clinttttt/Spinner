using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.LaundryStatusBoard.MarkBeingProcessed;

public sealed record MarkBeingProcessedCommand(Guid OrderId) : IRequest<Result<OrderDetailsResponse>>;
