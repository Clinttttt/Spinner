using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;

namespace Spinner.Test.TestHelpers;

public static class AppDbContextFactory
{
    public static AppDbContext Create()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }
}
