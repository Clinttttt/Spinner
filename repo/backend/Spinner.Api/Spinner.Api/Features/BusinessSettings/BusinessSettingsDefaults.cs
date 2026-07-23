using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;
using DomainBusinessSettings = Spinner.Api.Domain.Business.BusinessSettings;

namespace Spinner.Api.Features.BusinessSettings;

public static class BusinessSettingsDefaults
{
    public static async Task<DomainBusinessSettings> GetOrCreateAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var settings = await dbContext.BusinessSettings.FirstOrDefaultAsync(cancellationToken);

        if (settings is not null)
            return settings;

        settings = new DomainBusinessSettings(
            "Engr. Spin Laundry",
            "09170000000",
            "Cabadbaran City",
            DateTimeOffset.UtcNow);

        dbContext.BusinessSettings.Add(settings);
        await dbContext.SaveChangesAsync(cancellationToken);

        return settings;
    }
}
