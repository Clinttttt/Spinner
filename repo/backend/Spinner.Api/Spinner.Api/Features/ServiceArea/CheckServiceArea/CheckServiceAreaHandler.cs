using MediatR;
using Spinner.Api.Common.Geo;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.ServiceArea.CheckServiceArea;

public sealed class CheckServiceAreaHandler
    : IRequestHandler<CheckServiceAreaQuery, Result<ServiceAreaCheckResponse>>
{
    private readonly IServiceAreaPolicyProvider _policyProvider;

    public CheckServiceAreaHandler(IServiceAreaPolicyProvider policyProvider)
    {
        _policyProvider = policyProvider;
    }

    public async Task<Result<ServiceAreaCheckResponse>> Handle(
        CheckServiceAreaQuery request,
        CancellationToken cancellationToken)
    {
        var point = new GeoPoint(request.Latitude, request.Longitude);

        if (!point.IsValid)
            return Result<ServiceAreaCheckResponse>.Validation("Latitude or longitude is out of range.");

        var policy = await _policyProvider.GetAsync(cancellationToken);

        return Result<ServiceAreaCheckResponse>.Success(
            ServiceAreaCheckResponse.FromDecision(policy.Evaluate(point)));
    }
}
