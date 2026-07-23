using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Orders.UpdateOrderStatus;

public sealed record UpdateOrderStatusCommand(Guid OrderId, OrderStatus Status)
    : IRequest<Result<OrderDetailsResponse>>;
