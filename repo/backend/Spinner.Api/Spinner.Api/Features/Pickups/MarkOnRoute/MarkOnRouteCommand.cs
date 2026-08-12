using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Pickups.MarkOnRoute;

public sealed record MarkOnRouteCommand(Guid OrderId) : IRequest<Result<PickupDetailsResponse>>;
