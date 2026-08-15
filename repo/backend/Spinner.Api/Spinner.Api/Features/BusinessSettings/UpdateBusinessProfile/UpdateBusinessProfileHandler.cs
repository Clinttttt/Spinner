using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Features.Media;
using Spinner.Api.Integrations.Media;

namespace Spinner.Api.Features.BusinessSettings.UpdateBusinessProfile;

public sealed class UpdateBusinessProfileHandler
    : IRequestHandler<UpdateBusinessProfileCommand, Result<BusinessSettingsResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IMediaStorage _mediaStorage;
    private readonly ILogger<UpdateBusinessProfileHandler> _logger;

    public UpdateBusinessProfileHandler(
        AppDbContext dbContext,
        IMediaStorage mediaStorage,
        ILogger<UpdateBusinessProfileHandler> logger)
    {
        _dbContext = dbContext;
        _mediaStorage = mediaStorage;
        _logger = logger;
    }

    public async Task<Result<BusinessSettingsResponse>> Handle(
        UpdateBusinessProfileCommand request,
        CancellationToken cancellationToken)
    {
        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        var previousLogoUrl = settings.LogoUrl;

        settings.UpdateProfile(
            request.BusinessName,
            request.LogoUrl,
            request.PhoneNumber,
            request.Address,
            DateTimeOffset.UtcNow);

        await _dbContext.SaveChangesAsync(cancellationToken);

        await MediaCleanup.RemoveSupersededAsync(
            _mediaStorage,
            _logger,
            previousLogoUrl,
            settings.LogoUrl,
            cancellationToken);

        return Result<BusinessSettingsResponse>.Success(BusinessSettingsResponse.FromEntity(settings));
    }
}
