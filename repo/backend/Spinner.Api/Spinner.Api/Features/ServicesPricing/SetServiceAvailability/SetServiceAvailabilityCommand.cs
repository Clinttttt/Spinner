using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.ServicesPricing.SetServiceAvailability;

public sealed record SetServiceAvailabilityCommand(Guid ServiceId, bool IsActive)
    : IRequest<Result<ServiceResponse>>;
