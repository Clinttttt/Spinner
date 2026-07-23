using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.ServicesPricing.CreateService;

public sealed record CreateServiceCommand(
    string Name,
    string? Description,
    string UnitLabel,
    decimal BasePrice,
    bool SupportsPickupAndDelivery,
    decimal? DeliveryFee) : IRequest<Result<ServiceResponse>>;
