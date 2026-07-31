using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Auth.Login;
using Spinner.Test.TestHelpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Spinner.Test.Features.Auth;

public sealed class LoginHandlerTests
{
    [Fact]
    public async Task Login_Should_Return_Token_When_Credentials_Are_Valid()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        var user = new StaffUser(
            "Spinner Owner",
            "owner@spinner.local",
            "09170000000",
            hasher.Hash("Owner@12345"),
            StaffRole.Owner,
            DateTimeOffset.UtcNow);
        user.MarkEmailVerifiedForBootstrap(DateTimeOffset.UtcNow);
        dbContext.StaffUsers.Add(user);
        await dbContext.SaveChangesAsync();

        var handler = CreateHandler(dbContext, hasher);

        var result = await handler.Handle(new LoginCommand("owner@spinner.local", "Owner@12345"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("test-token", result.Value!.AccessToken);
        Assert.Equal("test-refresh-token", result.Value.RefreshToken);
        Assert.Equal(user.Id, result.Value.UserId);
        Assert.Equal(StaffRole.Owner, result.Value.Role);
        Assert.Equal(1, await dbContext.RefreshTokenSessions.CountAsync());
    }

    [Fact]
    public async Task Login_Should_Return_Unauthorized_When_Password_Is_Invalid()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        var user = new StaffUser(
            "Spinner Owner",
            "owner@spinner.local",
            null,
            hasher.Hash("Owner@12345"),
            StaffRole.Owner,
            DateTimeOffset.UtcNow);
        user.MarkEmailVerifiedForBootstrap(DateTimeOffset.UtcNow);
        dbContext.StaffUsers.Add(user);
        await dbContext.SaveChangesAsync();

        var handler = CreateHandler(dbContext, hasher);

        var result = await handler.Handle(new LoginCommand("owner@spinner.local", "bad-password"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.Unauthorized, result.Status);
    }

    [Fact]
    public async Task Login_Should_Return_Forbidden_When_Email_Is_Not_Verified()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        dbContext.StaffUsers.Add(new StaffUser(
            "Spinner Owner",
            "owner@spinner.local",
            null,
            hasher.Hash("Owner@12345"),
            StaffRole.Owner,
            DateTimeOffset.UtcNow));
        await dbContext.SaveChangesAsync();

        var handler = CreateHandler(dbContext, hasher);
        var result = await handler.Handle(
            new LoginCommand("owner@spinner.local", "Owner@12345"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.Forbidden, result.Status);
        Assert.Empty(await dbContext.RefreshTokenSessions.ToListAsync());
    }

    private sealed class StubJwtTokenService : IJwtTokenService
    {
        public AccessTokenResult CreateToken(StaffUser user) =>
            new("test-token", DateTimeOffset.UtcNow.AddMinutes(15));
    }

    private sealed class StubRefreshTokenService : IRefreshTokenService
    {
        public GeneratedRefreshToken Generate() =>
            new("test-refresh-token", Hash("test-refresh-token"));

        public string Hash(string token) => $"HASH:{token}";
    }

    private static LoginHandler CreateHandler(
        Spinner.Api.Database.AppDbContext dbContext,
        IPasswordHasher passwordHasher)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:RefreshTokenDays"] = "30"
            })
            .Build();

        return new LoginHandler(
            dbContext,
            passwordHasher,
            new StubJwtTokenService(),
            new StubRefreshTokenService(),
            configuration);
    }
}
