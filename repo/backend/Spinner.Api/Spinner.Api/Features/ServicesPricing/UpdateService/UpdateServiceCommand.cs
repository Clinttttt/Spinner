using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.ServicesPricing.UpdateService;

public sealed record UpdateServiceCommand(
    Guid ServiceId,
    string Name,
    string? Description,
    bool SupportsPickupAndDelivery) : IRequest<Result<ServiceResponse>>;
