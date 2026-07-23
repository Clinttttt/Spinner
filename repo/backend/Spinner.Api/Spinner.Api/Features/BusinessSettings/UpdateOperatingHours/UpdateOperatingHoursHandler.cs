using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.BusinessSettings.UpdateOperatingHours;

public sealed class UpdateOperatingHoursHandler
    : IRequestHandler<UpdateOperatingHoursCommand, Result<BusinessSettingsResponse>>
{
    private readonly AppDbContext _dbContext;

    public UpdateOperatingHoursHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<BusinessSettingsResponse>> Handle(
        UpdateOperatingHoursCommand request,
        CancellationToken cancellationToken)
    {
        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        settings.UpdateOperatingHours(request.OperatingHours, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<BusinessSettingsResponse>.Success(BusinessSettingsResponse.FromEntity(settings));
    }
}
