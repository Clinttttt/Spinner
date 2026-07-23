namespace Spinner.Api.Features.ServicesPricing.UpdateService;

public sealed record UpdateServiceRequest(
    string Name,
    string? Description,
    bool SupportsPickupAndDelivery);
