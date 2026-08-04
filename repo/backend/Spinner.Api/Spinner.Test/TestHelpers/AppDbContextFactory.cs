using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.InMemory.Diagnostics.Internal;
using Spinner.Api.Database;

namespace Spinner.Test.TestHelpers;

public static class AppDbContextFactory
{
    public static AppDbContext Create() => Create(Guid.NewGuid().ToString());

    /// <summary>
    /// Two contexts over one store, to represent two API instances.
    /// </summary>
    /// <remarks>
    /// Concurrency guards cannot be exercised through a single context, because it
    /// serves both reads from the same change tracker. Duplicate notification sends
    /// and double payment confirmations only happen across instances.
    /// </remarks>
    public static (AppDbContext First, AppDbContext Second) CreatePair()
    {
        var databaseName = Guid.NewGuid().ToString();
        return (Create(databaseName), Create(databaseName));
    }

    private static AppDbContext Create(string databaseName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            // The in-memory store has no transactions and complains when code asks
            // for one. Production runs on PostgreSQL, where the transaction is real;
            // the tests still exercise the logical guards around it.
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new AppDbContext(options);
    }
}
