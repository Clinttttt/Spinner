using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.BusinessSettings.UpdatePickupTimes;

public sealed class UpdatePickupTimesHandler
    : IRequestHandler<UpdatePickupTimesCommand, Result<BusinessSettingsResponse>>
{
    private readonly AppDbContext _dbContext;

    public UpdatePickupTimesHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<BusinessSettingsResponse>> Handle(
        UpdatePickupTimesCommand request,
        CancellationToken cancellationToken)
    {
        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        settings.UpdatePickupTimes(request.PickupTimeWindows, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<BusinessSettingsResponse>.Success(BusinessSettingsResponse.FromEntity(settings));
    }
}
