using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Deliveries.GetDeliveryDetails;

public sealed record GetDeliveryDetailsQuery(Guid OrderId) : IRequest<Result<DeliveryDetailsResponse>>;
