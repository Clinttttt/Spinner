using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;

namespace Spinner.Test.TestHelpers;

/// <summary>
/// A context configured for PostgreSQL that never connects to anything.
/// </summary>
/// <remarks>
/// Exists because the in-memory provider the other tests use is far more permissive
/// than the real one. It happily executes shapes PostgreSQL cannot be given a query
/// for — ordering by a record's constructor argument, or filtering a union on an
/// unwrapped nullable — so a query could pass every test and still fail on the first
/// real request. Asking Npgsql to produce the SQL exercises the whole translation
/// step without needing a database to point at.
/// </remarks>
public static class PostgresQueryFactory
{
    public static AppDbContext Create()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            // Never opened. Only the model and the SQL generator are used.
            .UseNpgsql("Host=localhost;Database=translation-check;Username=none;Password=none")
            .Options;

        return new AppDbContext(options);
    }
}
