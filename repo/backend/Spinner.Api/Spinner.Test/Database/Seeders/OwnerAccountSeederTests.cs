using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;
using Spinner.Api.Database.Seeders;
using Spinner.Api.Domain.Users;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Database.Seeders;

/// <summary>
/// The seeder creates the first owner account so a fresh development database can be signed
/// into. It used to carry its password as a public constant, which put working owner
/// credentials in a public repository; these tests hold the line that there is no password in
/// the source and that no deployment can seed an account.
/// </summary>
public sealed class OwnerAccountSeederTests
{
    private const string Password = "A-Test-Bootstrap-Password@2026";

    [Fact]
    public async Task SeedAsync_Should_Create_The_Owner_From_The_Configured_Password()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();

        await Seeder(dbContext, hasher, password: Password).SeedAsync();

        var user = await dbContext.StaffUsers.SingleAsync();
        Assert.Equal(OwnerAccountSeeder.DefaultEmail, user.EmailAddress);
        Assert.Equal(StaffRole.Owner, user.Role);
        Assert.True(user.IsEmailVerified);
        Assert.NotNull(user.EmailVerifiedAt);
        Assert.True(hasher.Verify(Password, user.PasswordHash));
    }

    [Fact]
    public async Task SeedAsync_Should_Not_Create_Duplicate_Owner()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var seeder = Seeder(dbContext, password: Password);

        await seeder.SeedAsync();
        await seeder.SeedAsync();

        Assert.Single(dbContext.StaffUsers);
    }

    [Fact]
    public async Task SeedAsync_Should_Create_Nothing_Without_A_Configured_Password()
    {
        // Refused rather than invented. An account nobody chose the password for is either
        // guessable or unusable, and neither belongs in a database.
        await using var dbContext = AppDbContextFactory.Create();

        await Seeder(dbContext, password: null).SeedAsync();

        Assert.Empty(dbContext.StaffUsers);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public async Task SeedAsync_Should_Refuse_Outside_Development(string environmentName)
    {
        // The guard that matters most: a flag set by mistake must not be able to create an
        // owner account on a real deployment, even with a password supplied.
        await using var dbContext = AppDbContextFactory.Create();

        await Seeder(dbContext, password: Password, environmentName: environmentName).SeedAsync();

        Assert.Empty(dbContext.StaffUsers);
    }

    private static OwnerAccountSeeder Seeder(
        AppDbContext dbContext,
        IPasswordHasher? hasher = null,
        string? password = null,
        string environmentName = "Development")
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [OwnerAccountSeeder.PasswordConfigurationKey] = password,
            })
            .Build();

        return new OwnerAccountSeeder(
            dbContext,
            hasher ?? new PasswordHasher(),
            configuration,
            new TestEnvironment(environmentName),
            NullLogger<OwnerAccountSeeder>.Instance);
    }

    private sealed class TestEnvironment : IHostEnvironment
    {
        public TestEnvironment(string environmentName)
        {
            EnvironmentName = environmentName;
        }

        public string EnvironmentName { get; set; }
        public string ApplicationName { get; set; } = "Spinner.Test";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
