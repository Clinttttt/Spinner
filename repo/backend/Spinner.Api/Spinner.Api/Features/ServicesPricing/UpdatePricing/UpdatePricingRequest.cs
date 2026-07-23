namespace Spinner.Api.Features.ServicesPricing.UpdatePricing;

public sealed record UpdatePricingRequest(
    string UnitLabel,
    decimal BasePrice,
    decimal? DeliveryFee);
