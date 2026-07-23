using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Pickups.FailPickup;

public sealed record FailPickupCommand(Guid OrderId, string Reason) : IRequest<Result<PickupDetailsResponse>>;
