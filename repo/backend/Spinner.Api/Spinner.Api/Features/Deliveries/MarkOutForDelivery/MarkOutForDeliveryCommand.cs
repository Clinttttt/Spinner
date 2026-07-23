using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Deliveries.MarkOutForDelivery;

public sealed record MarkOutForDeliveryCommand(Guid OrderId) : IRequest<Result<DeliveryDetailsResponse>>;
