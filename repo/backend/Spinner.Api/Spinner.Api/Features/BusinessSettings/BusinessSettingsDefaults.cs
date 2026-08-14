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

        // First run only: a settings row has to exist before anything can read a radius or a
        // payment method. Deliberately placeholders rather than a real shop's details, so a
        // fresh deployment shows something obviously unset instead of quietly presenting
        // another laundromat's name, number and address as its own.
        settings = new DomainBusinessSettings(
            "My Laundry Shop",
            "",
            "",
            DateTimeOffset.UtcNow);

        dbContext.BusinessSettings.Add(settings);
        await dbContext.SaveChangesAsync(cancellationToken);

        return settings;
    }
}
