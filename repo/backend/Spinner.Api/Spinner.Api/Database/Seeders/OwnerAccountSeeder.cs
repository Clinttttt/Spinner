using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;

namespace Spinner.Api.Database.Seeders;

/// <summary>
/// Creates the first owner account so a fresh development database can be signed into.
/// </summary>
/// <remarks>
/// This used to publish its password as <c>public const string DefaultPassword</c>. The
/// repository is public, so that put working credentials for a bootstrap owner account on the
/// internet — and because the same seeder had run against the deployed database, the account it
/// created was a real, active owner. Its password had since been changed, so nothing was
/// exposed in practice, but the pattern only had to be followed once to hand somebody the till.
///
/// Now there is no password in the source at all. One has to be supplied through configuration,
/// and seeding is refused outside Development whatever the flag says, so no deployment can
/// create an account this way even by accident.
/// </remarks>
public sealed class OwnerAccountSeeder
{
    /// <summary>
    /// The bootstrap account's email address.
    /// </summary>
    /// <remarks>
    /// Kept public: an email address is not a credential, and both the tests and a developer
    /// signing in locally need to know which account was created.
    /// </remarks>
    public const string DefaultEmail = "owner@spinner.local";

    /// <summary>Where the bootstrap password is read from. Never a literal in this file.</summary>
    public const string PasswordConfigurationKey = "SeedData:OwnerPassword";

    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<OwnerAccountSeeder> _logger;

    public OwnerAccountSeeder(
        AppDbContext dbContext,
        IPasswordHasher passwordHasher,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<OwnerAccountSeeder> logger)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        // Independent of SeedData:EnableDevelopmentDefaults on purpose. A flag set by mistake
        // must not be able to create an owner account on a real deployment.
        if (!_environment.IsDevelopment())
        {
            _logger.LogWarning(
                "Owner account seeding was requested in {Environment} and refused. It only runs in Development.",
                _environment.EnvironmentName);
            return;
        }

        if (await _dbContext.StaffUsers.AnyAsync(cancellationToken))
            return;

        var password = _configuration[PasswordConfigurationKey];

        if (string.IsNullOrWhiteSpace(password))
        {
            // Refused rather than invented, and deliberately not logged as a generated value:
            // a password printed into the log is a password stored in the log.
            _logger.LogWarning(
                "No owner account was seeded because {Key} is not set. Set it in user secrets or " +
                "an environment variable to bootstrap a development database.",
                PasswordConfigurationKey);
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var user = new StaffUser(
            "Spinner Owner",
            DefaultEmail,
            "09170000000",
            _passwordHasher.Hash(password),
            StaffRole.Owner,
            now);
        user.MarkEmailVerifiedForBootstrap(now);
        _dbContext.StaffUsers.Add(user);

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Seeded the bootstrap owner account {Email} for development.",
            DefaultEmail);
    }
}
