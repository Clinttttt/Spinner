using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;

namespace Spinner.Api.Common.Health;

public sealed record DatabaseReadinessResult(
    bool CanConnect,
    int PendingMigrationCount)
{
    public bool IsReady => CanConnect && PendingMigrationCount == 0;

    public static DatabaseReadinessResult Unreachable() => new(false, 0);

    public static DatabaseReadinessResult Connected(int pendingMigrationCount) =>
        new(true, pendingMigrationCount);
}

public interface IDatabaseReadinessProbe
{
    Task<DatabaseReadinessResult> CheckAsync(CancellationToken cancellationToken);
}

public sealed class DatabaseReadinessProbe : IDatabaseReadinessProbe
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<DatabaseReadinessProbe> _logger;

    public DatabaseReadinessProbe(
        AppDbContext dbContext,
        ILogger<DatabaseReadinessProbe> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<DatabaseReadinessResult> CheckAsync(
        CancellationToken cancellationToken)
    {
        try
        {
            if (!await _dbContext.Database.CanConnectAsync(cancellationToken))
                return DatabaseReadinessResult.Unreachable();

            var pendingMigrationCount = (
                await _dbContext.Database.GetPendingMigrationsAsync(
                    cancellationToken))
                .Count();

            return DatabaseReadinessResult.Connected(pendingMigrationCount);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Database readiness verification failed.");
            return DatabaseReadinessResult.Unreachable();
        }
    }
}
