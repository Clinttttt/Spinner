using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Security;
using Spinner.Api.Database.Seeders;
using Spinner.Api.Domain.Users;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Database.Seeders;

public sealed class OwnerAccountSeederTests
{
    [Fact]
    public async Task SeedAsync_Should_Create_Default_Owner_When_No_Users_Exist()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        var seeder = new OwnerAccountSeeder(dbContext, hasher);

        await seeder.SeedAsync();

        var user = await dbContext.StaffUsers.SingleAsync();
        Assert.Equal(OwnerAccountSeeder.DefaultEmail, user.EmailAddress);
        Assert.Equal(StaffRole.Owner, user.Role);
        Assert.True(hasher.Verify(OwnerAccountSeeder.DefaultPassword, user.PasswordHash));
    }

    [Fact]
    public async Task SeedAsync_Should_Not_Create_Duplicate_Owner()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var seeder = new OwnerAccountSeeder(dbContext, new PasswordHasher());

        await seeder.SeedAsync();
        await seeder.SeedAsync();

        Assert.Single(dbContext.StaffUsers);
    }
}
