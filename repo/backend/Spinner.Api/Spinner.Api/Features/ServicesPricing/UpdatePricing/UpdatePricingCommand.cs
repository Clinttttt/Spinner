using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.ServicesPricing.UpdatePricing;

public sealed record UpdatePricingCommand(
    Guid ServiceId,
    string UnitLabel,
    decimal BasePrice,
    decimal? DeliveryFee) : IRequest<Result<ServiceResponse>>;
