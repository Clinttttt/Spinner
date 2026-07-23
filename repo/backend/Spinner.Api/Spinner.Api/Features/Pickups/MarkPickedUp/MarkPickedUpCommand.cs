using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Pickups.MarkPickedUp;

public sealed record MarkPickedUpCommand(Guid OrderId) : IRequest<Result<PickupDetailsResponse>>;
