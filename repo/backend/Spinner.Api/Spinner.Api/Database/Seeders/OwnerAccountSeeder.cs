using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;

namespace Spinner.Api.Database.Seeders;

public sealed class OwnerAccountSeeder
{
    public const string DefaultEmail = "owner@spinner.local";
    public const string DefaultPassword = "Owner@12345";

    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;

    public OwnerAccountSeeder(AppDbContext dbContext, IPasswordHasher passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var exists = await _dbContext.StaffUsers.AnyAsync(cancellationToken);

        if (exists)
            return;

        var now = DateTimeOffset.UtcNow;
        var user = new StaffUser(
            "Spinner Owner",
            DefaultEmail,
            "09170000000",
            _passwordHasher.Hash(DefaultPassword),
            StaffRole.Owner,
            now);
        user.MarkEmailVerifiedForBootstrap(now);
        _dbContext.StaffUsers.Add(user);

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
