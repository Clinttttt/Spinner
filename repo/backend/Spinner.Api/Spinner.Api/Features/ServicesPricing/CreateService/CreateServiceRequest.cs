namespace Spinner.Api.Features.ServicesPricing.CreateService;

public sealed record CreateServiceRequest(
    string Name,
    string? Description,
    string UnitLabel,
    decimal BasePrice,
    bool SupportsPickupAndDelivery,
    decimal? DeliveryFee);
