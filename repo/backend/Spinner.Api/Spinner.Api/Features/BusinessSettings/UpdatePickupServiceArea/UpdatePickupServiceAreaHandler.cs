using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.BusinessSettings.UpdatePickupServiceArea;

public sealed class UpdatePickupServiceAreaHandler
    : IRequestHandler<UpdatePickupServiceAreaCommand, Result<BusinessSettingsResponse>>
{
    private readonly AppDbContext _dbContext;

    public UpdatePickupServiceAreaHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<BusinessSettingsResponse>> Handle(
        UpdatePickupServiceAreaCommand request,
        CancellationToken cancellationToken)
    {
        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        var update = settings.UpdatePickupServiceArea(
            request.OriginLatitude,
            request.OriginLongitude,
            request.RadiusKm,
            DateTimeOffset.UtcNow);

        if (!update.IsSuccess)
            return Result<BusinessSettingsResponse>.Validation(update.Error.Message);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<BusinessSettingsResponse>.Success(BusinessSettingsResponse.FromEntity(settings));
    }
}
