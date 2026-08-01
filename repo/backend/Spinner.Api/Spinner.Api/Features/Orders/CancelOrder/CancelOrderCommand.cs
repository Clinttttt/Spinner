using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.Orders.CancelOrder;

public sealed record CancelOrderCommand(Guid OrderId) : IRequest<Result<OrderDetailsResponse>>;
