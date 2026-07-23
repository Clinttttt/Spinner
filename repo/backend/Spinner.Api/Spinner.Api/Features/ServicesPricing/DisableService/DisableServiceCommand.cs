using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.ServicesPricing.DisableService;

public sealed record DisableServiceCommand(Guid ServiceId) : IRequest<Result<ServiceResponse>>;
