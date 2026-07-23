using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Pickups.GetPickupDetails;

public sealed record GetPickupDetailsQuery(Guid OrderId) : IRequest<Result<PickupDetailsResponse>>;
