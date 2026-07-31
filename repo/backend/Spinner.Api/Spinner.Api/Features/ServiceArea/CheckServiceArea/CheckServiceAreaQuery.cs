using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.ServiceArea.CheckServiceArea;

public sealed record CheckServiceAreaQuery(decimal Latitude, decimal Longitude)
    : IRequest<Result<ServiceAreaCheckResponse>>;

public sealed record ServiceAreaCheckResponse(
    /// <summary>inside | outside | notConfigured</summary>
    string Status,
    bool AllowsBooking,
    double? DistanceKm,
    double? MaxRadiusKm,
    string Policy,
    string Message)
{
    public static ServiceAreaCheckResponse FromDecision(ServiceAreaDecision decision) => new(
        decision.Status switch
        {
            ServiceAreaStatus.Inside => "inside",
            ServiceAreaStatus.Outside => "outside",
            _ => "notConfigured",
        },
        decision.AllowsBooking,
        decision.DistanceKm,
        decision.MaxRadiusKm,
        decision.PolicyName,
        decision.Message);
}
