using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.LaundryStatusBoard.MarkReadyForDelivery;

public sealed record MarkReadyForDeliveryCommand(Guid OrderId) : IRequest<Result<OrderDetailsResponse>>;
