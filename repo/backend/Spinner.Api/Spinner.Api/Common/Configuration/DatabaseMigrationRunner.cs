using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;

namespace Spinner.Api.Common.Configuration;

/// <summary>
/// Applies pending EF Core migrations as a standalone operation.
/// </summary>
/// <remarks>
/// Deliberately independent of the web host. A schema migration needs a database
/// connection and nothing else, so it must not require the JWT signing key,
/// payment webhook secret, or email provider credentials that
/// <see cref="StartupConfigurationValidator"/> demands of the running API. That
/// lets a deployment pipeline migrate with a single secret instead of a copy of
/// the entire application configuration.
/// </remarks>
public static class DatabaseMigrationRunner
{
    public const string CommandLineSwitch = "--migrate";

    /// <summary>
    /// Container-friendly alternative to the command-line switch. Overriding a
    /// container's arguments with a value that starts with "--" is awkward in
    /// most orchestrators and tooling, so a plain environment variable is the
    /// supported way to run migrations from a deployment pipeline.
    /// </summary>
    public const string EnvironmentVariable = "SPINNER_RUN_MIGRATIONS";

    public static bool IsRequested(string[] args) =>
        args.Contains(CommandLineSwitch, StringComparer.OrdinalIgnoreCase) ||
        IsEnvironmentVariableEnabled(Environment.GetEnvironmentVariable(EnvironmentVariable));

    public static bool IsEnvironmentVariableEnabled(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;

        var trimmed = value.Trim();

        return bool.TryParse(trimmed, out var parsed)
            ? parsed
            : trimmed is "1";
    }

    public static async Task RunAsync(string[] args)
    {
        var builder = Host.CreateApplicationBuilder(args);
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection must be configured to run migrations.");
        }

        builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

        using var host = builder.Build();
        var logger = host.Services
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("DatabaseMigration");

        await using var scope = host.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var pending = (await dbContext.Database.GetPendingMigrationsAsync()).ToList();

        if (pending.Count == 0)
        {
            logger.LogInformation("Database schema is already up to date. No migrations applied.");
            return;
        }

        logger.LogInformation(
            "Applying {Count} pending migration(s): {Migrations}",
            pending.Count,
            string.Join(", ", pending));

        await dbContext.Database.MigrateAsync();

        logger.LogInformation("Database migrations completed.");
    }
}
