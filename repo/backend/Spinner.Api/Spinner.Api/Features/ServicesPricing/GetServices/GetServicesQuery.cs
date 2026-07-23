using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.ServicesPricing.GetServices;

public sealed record GetServicesQuery(bool ActiveOnly) : IRequest<Result<IReadOnlyList<ServiceResponse>>>;
