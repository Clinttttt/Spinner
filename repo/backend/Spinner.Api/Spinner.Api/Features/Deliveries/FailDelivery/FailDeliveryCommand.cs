using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Deliveries.FailDelivery;

public sealed record FailDeliveryCommand(Guid OrderId, string Reason) : IRequest<Result<DeliveryDetailsResponse>>;
