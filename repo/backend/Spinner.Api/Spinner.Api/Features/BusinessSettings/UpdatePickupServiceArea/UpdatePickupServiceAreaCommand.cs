using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.BusinessSettings.UpdatePickupServiceArea;

public sealed record UpdatePickupServiceAreaRequest(
    decimal? OriginLatitude,
    decimal? OriginLongitude,
    decimal RadiusKm);

public sealed record UpdatePickupServiceAreaCommand(
    decimal? OriginLatitude,
    decimal? OriginLongitude,
    decimal RadiusKm) : IRequest<Result<BusinessSettingsResponse>>;
