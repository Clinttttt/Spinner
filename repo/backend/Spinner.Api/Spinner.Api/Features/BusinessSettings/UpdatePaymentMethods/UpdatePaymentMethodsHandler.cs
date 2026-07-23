using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.BusinessSettings.UpdatePaymentMethods;

public sealed class UpdatePaymentMethodsHandler
    : IRequestHandler<UpdatePaymentMethodsCommand, Result<BusinessSettingsResponse>>
{
    private readonly AppDbContext _dbContext;

    public UpdatePaymentMethodsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<BusinessSettingsResponse>> Handle(
        UpdatePaymentMethodsCommand request,
        CancellationToken cancellationToken)
    {
        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        var result = settings.UpdatePaymentMethods(
            request.IsCashOnDeliveryEnabled,
            request.IsQrCodeOnlinePaymentEnabled,
            DateTimeOffset.UtcNow);

        if (!result.IsSuccess)
            return Result<BusinessSettingsResponse>.Validation(result.Error.Message);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<BusinessSettingsResponse>.Success(BusinessSettingsResponse.FromEntity(settings));
    }
}
