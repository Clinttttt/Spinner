using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Auth.RefreshSession;
using Spinner.Api.Features.Auth.RevokeAllSessions;
using Spinner.Api.Features.Auth.RevokeSession;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Auth;

public sealed class RefreshSessionHandlerTests
{
    [Fact]
    public async Task Refresh_Should_Rotate_Refresh_Token()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var refreshTokens = new StubRefreshTokenService();
        var user = CreateUser();
        var original = CreateSession(user, refreshTokens, "original-token");
        dbContext.AddRange(user, original);
        await dbContext.SaveChangesAsync();

        var handler = CreateRefreshHandler(dbContext, refreshTokens);
        var result = await handler.Handle(
            new RefreshSessionCommand("original-token"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("rotated-token", result.Value!.RefreshToken);
        Assert.NotNull(original.RevokedAt);
        Assert.NotNull(original.ReplacedByTokenId);

        var replacement = await dbContext.RefreshTokenSessions
            .SingleAsync(session => session.Id == original.ReplacedByTokenId);
        Assert.True(replacement.IsActive(DateTimeOffset.UtcNow));
        Assert.Equal(original.FamilyId, replacement.FamilyId);
    }

    [Fact]
    public async Task Refresh_Should_Revoke_Family_When_Rotated_Token_Is_Reused()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var refreshTokens = new StubRefreshTokenService();
        var user = CreateUser();
        var original = CreateSession(user, refreshTokens, "original-token");
        dbContext.AddRange(user, original);
        await dbContext.SaveChangesAsync();
        var handler = CreateRefreshHandler(dbContext, refreshTokens);

        var first = await handler.Handle(
            new RefreshSessionCommand("original-token"),
            CancellationToken.None);
        var reused = await handler.Handle(
            new RefreshSessionCommand("original-token"),
            CancellationToken.None);

        Assert.True(first.IsSuccess);
        Assert.False(reused.IsSuccess);
        Assert.Equal(ResultStatus.Unauthorized, reused.Status);
        Assert.All(
            await dbContext.RefreshTokenSessions
                .Where(session => session.FamilyId == original.FamilyId)
                .ToListAsync(),
            session => Assert.NotNull(session.RevokedAt));
    }

    [Fact]
    public async Task Logout_Should_Revoke_Current_Session()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var refreshTokens = new StubRefreshTokenService();
        var user = CreateUser();
        var session = CreateSession(user, refreshTokens, "logout-token");
        dbContext.AddRange(user, session);
        await dbContext.SaveChangesAsync();

        var handler = new RevokeSessionHandler(dbContext, refreshTokens);
        var result = await handler.Handle(
            new RevokeSessionCommand("logout-token"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(ResultStatus.NoContent, result.Status);
        Assert.NotNull(session.RevokedAt);
    }

    [Fact]
    public async Task LogoutAll_Should_Revoke_All_User_Sessions_Only()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var refreshTokens = new StubRefreshTokenService();
        var user = CreateUser();
        var otherUser = new StaffUser(
            "Other Staff",
            "staff@spinner.local",
            null,
            new PasswordHasher().Hash("Staff@12345"),
            StaffRole.Staff,
            DateTimeOffset.UtcNow);
        var first = CreateSession(user, refreshTokens, "first-token");
        var second = CreateSession(user, refreshTokens, "second-token");
        var other = CreateSession(otherUser, refreshTokens, "other-token");
        dbContext.AddRange(user, otherUser, first, second, other);
        await dbContext.SaveChangesAsync();

        var handler = new RevokeAllSessionsHandler(dbContext);
        var result = await handler.Handle(
            new RevokeAllSessionsCommand(user.Id),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(first.RevokedAt);
        Assert.NotNull(second.RevokedAt);
        Assert.Null(other.RevokedAt);
    }

    private static RefreshSessionHandler CreateRefreshHandler(
        Spinner.Api.Database.AppDbContext dbContext,
        IRefreshTokenService refreshTokenService)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:RefreshTokenDays"] = "30"
            })
            .Build();

        return new RefreshSessionHandler(
            dbContext,
            new StubJwtTokenService(),
            refreshTokenService,
            configuration);
    }

    private static RefreshTokenSession CreateSession(
        StaffUser user,
        IRefreshTokenService refreshTokenService,
        string token)
    {
        return new RefreshTokenSession(
            user.Id,
            refreshTokenService.Hash(token),
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddDays(30),
            DateTimeOffset.UtcNow);
    }

    private static StaffUser CreateUser()
    {
        return new StaffUser(
            "Spinner Owner",
            "owner@spinner.local",
            "09170000000",
            new PasswordHasher().Hash("Owner@12345"),
            StaffRole.Owner,
            DateTimeOffset.UtcNow);
    }

    private sealed class StubJwtTokenService : IJwtTokenService
    {
        public AccessTokenResult CreateToken(StaffUser user) =>
            new("refreshed-access-token", DateTimeOffset.UtcNow.AddMinutes(15));
    }

    private sealed class StubRefreshTokenService : IRefreshTokenService
    {
        public GeneratedRefreshToken Generate() =>
            new("rotated-token", Hash("rotated-token"));

        public string Hash(string token) => $"HASH:{token}";
    }
}
