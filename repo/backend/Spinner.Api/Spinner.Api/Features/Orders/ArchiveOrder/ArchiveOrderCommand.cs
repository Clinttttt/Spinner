using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Orders.ArchiveOrder;

public sealed record ArchiveOrderCommand(Guid OrderId, bool Archive)
    : IRequest<Result<OrderDetailsResponse>>;
