using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.BusinessSettings.GetBusinessSettings;

public sealed class GetBusinessSettingsHandler
    : IRequestHandler<GetBusinessSettingsQuery, Result<BusinessSettingsResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetBusinessSettingsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<BusinessSettingsResponse>> Handle(
        GetBusinessSettingsQuery request,
        CancellationToken cancellationToken)
    {
        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        return Result<BusinessSettingsResponse>.Success(BusinessSettingsResponse.FromEntity(settings));
    }
}
