using Spinner.Api.Domain.Services;

namespace Spinner.Api.Features.ServicesPricing;

public sealed record ServiceResponse(
    Guid Id,
    string Name,
    string? Description,
    string UnitLabel,
    decimal BasePrice,
    bool SupportsPickupAndDelivery,
    decimal? DeliveryFee,
    bool IsActive,
    DateTimeOffset UpdatedAt)
{
    public static ServiceResponse FromEntity(LaundryService service) => new(
        service.Id,
        service.Name,
        service.Description,
        service.UnitLabel,
        service.BasePrice,
        service.SupportsPickupAndDelivery,
        service.DeliveryFee,
        service.IsActive,
        service.UpdatedAt);
}
