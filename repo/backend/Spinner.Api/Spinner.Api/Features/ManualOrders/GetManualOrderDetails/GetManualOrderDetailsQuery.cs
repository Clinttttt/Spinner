using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.ManualOrders.GetManualOrderDetails;

public sealed record GetManualOrderDetailsQuery(Guid OrderId) : IRequest<Result<OrderDetailsResponse>>;
