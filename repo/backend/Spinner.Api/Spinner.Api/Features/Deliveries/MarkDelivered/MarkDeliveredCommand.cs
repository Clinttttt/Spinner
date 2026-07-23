using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Deliveries.MarkDelivered;

public sealed record MarkDeliveredCommand(Guid OrderId) : IRequest<Result<DeliveryDetailsResponse>>;
