using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Payments.CalculateOrderTotal;

public sealed record CalculateOrderTotalQuery(Guid OrderId) : IRequest<Result<OrderTotalResponse>>;
