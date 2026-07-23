using Microsoft.EntityFrameworkCore;
using Spinner.Api.Domain.Services;

namespace Spinner.Api.Database.Seeders;

public sealed class LaundryServiceSeeder
{
    private readonly AppDbContext _dbContext;

    public LaundryServiceSeeder(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (await _dbContext.LaundryServices.AnyAsync(cancellationToken))
            return;

        var now = DateTimeOffset.UtcNow;
        _dbContext.LaundryServices.AddRange(
            new LaundryService("Wash, Dry & Fold", "Complete wash, dry, and fold service.", "per load", 170m, true, 60m, now),
            new LaundryService("Dry Only", "Drying service for washed laundry.", "per load", 80m, true, 60m, now),
            new LaundryService("Self-Service", "Customer-operated washer service.", "per wash", 80m, false, null, now),
            new LaundryService("Hand Wash", "Gentle hand-wash service.", "per load", 200m, false, null, now));

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
