using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Orders.GetOrderDetails;

public sealed record GetOrderDetailsQuery(Guid OrderId) : IRequest<Result<OrderDetailsResponse>>;
