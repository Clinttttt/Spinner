using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.BusinessSettings.UpdateNotificationSettings;

public sealed class UpdateNotificationSettingsHandler
    : IRequestHandler<UpdateNotificationSettingsCommand, Result<BusinessSettingsResponse>>
{
    private readonly AppDbContext _dbContext;

    public UpdateNotificationSettingsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<BusinessSettingsResponse>> Handle(
        UpdateNotificationSettingsCommand request,
        CancellationToken cancellationToken)
    {
        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        settings.UpdateNotificationSettings(
            request.IsSmsBookingReceivedEnabled,
            request.IsSmsBookingConfirmedEnabled,
            request.IsSmsPickedUpEnabled,
            request.IsSmsReadyForDeliveryEnabled,
            request.IsSmsCompletedEnabled,
            request.IsEmailBookingConfirmedEnabled,
            request.IsEmailReceiptEnabled,
            request.IsEmailCompletedEnabled,
            DateTimeOffset.UtcNow);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<BusinessSettingsResponse>.Success(BusinessSettingsResponse.FromEntity(settings));
    }
}
