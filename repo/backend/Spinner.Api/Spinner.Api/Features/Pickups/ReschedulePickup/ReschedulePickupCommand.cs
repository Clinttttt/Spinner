using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Pickups.ReschedulePickup;

public sealed record ReschedulePickupCommand(
    Guid OrderId,
    DateOnly PreferredDate,
    string PreferredTimeWindow) : IRequest<Result<PickupDetailsResponse>>;
