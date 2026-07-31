using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Auth.VerifyEmail;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Auth;

public sealed class VerifyEmailHandlerTests
{
    [Fact]
    public async Task VerifyEmail_Should_Verify_User_Consume_Code_And_Create_Session()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        var now = DateTimeOffset.UtcNow;
        var user = new StaffUser(
            "Maria Santos",
            "maria@example.com",
            "09171234567",
            hasher.Hash("SecurePass1"),
            StaffRole.Owner,
            now);
        var actionCode = new AccountActionCode(
            user.Id,
            AccountActionPurpose.VerifyEmail,
            hasher.Hash("123456"),
            now.AddMinutes(15),
            now);
        dbContext.AddRange(user, actionCode);
        await dbContext.SaveChangesAsync();

        var handler = CreateHandler(dbContext, hasher);
        var result = await handler.Handle(
            new VerifyEmailCommand(user.EmailAddress, "123456"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(user.IsEmailVerified);
        Assert.NotNull(user.EmailVerifiedAt);
        Assert.NotNull(actionCode.ConsumedAt);
        Assert.Equal("test-token", result.Value!.AccessToken);
        Assert.Single(await dbContext.RefreshTokenSessions.ToListAsync());
    }

    [Fact]
    public async Task VerifyEmail_Should_Record_Failed_Attempt_For_Invalid_Code()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        var now = DateTimeOffset.UtcNow;
        var user = new StaffUser(
            "Maria Santos",
            "maria@example.com",
            null,
            hasher.Hash("SecurePass1"),
            StaffRole.Owner,
            now);
        var actionCode = new AccountActionCode(
            user.Id,
            AccountActionPurpose.VerifyEmail,
            hasher.Hash("123456"),
            now.AddMinutes(15),
            now);
        dbContext.AddRange(user, actionCode);
        await dbContext.SaveChangesAsync();

        var handler = CreateHandler(dbContext, hasher);
        var result = await handler.Handle(
            new VerifyEmailCommand(user.EmailAddress, "654321"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Validation, result.Status);
        Assert.Equal(1, actionCode.FailedAttemptCount);
        Assert.False(user.IsEmailVerified);
        Assert.Empty(await dbContext.RefreshTokenSessions.ToListAsync());
    }

    private static VerifyEmailHandler CreateHandler(
        Spinner.Api.Database.AppDbContext dbContext,
        IPasswordHasher passwordHasher)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:RefreshTokenDays"] = "30"
            })
            .Build();

        return new VerifyEmailHandler(
            dbContext,
            passwordHasher,
            new StubJwtTokenService(),
            new StubRefreshTokenService(),
            configuration,
            Options.Create(new AccountSecurityOptions()));
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
}
