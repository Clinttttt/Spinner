using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Auth.ForgotPassword;
using Spinner.Api.Features.Auth.ResetPassword;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Auth;

public sealed class PasswordRecoveryHandlerTests
{
    [Fact]
    public async Task ForgotPassword_Should_Queue_Code_For_Verified_User()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        var user = CreateVerifiedUser(hasher);
        dbContext.StaffUsers.Add(user);
        await dbContext.SaveChangesAsync();

        var handler = new ForgotPasswordHandler(
            dbContext,
            hasher,
            new StubAccountCodeGenerator(),
            Options.Create(new AccountSecurityOptions()));
        var result = await handler.Handle(
            new ForgotPasswordCommand(user.EmailAddress),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        var code = Assert.Single(await dbContext.AccountActionCodes.ToListAsync());
        Assert.Equal(AccountActionPurpose.ResetPassword, code.Purpose);
        var notification = Assert.Single(
            await dbContext.NotificationOutboxMessages.ToListAsync());
        Assert.Contains("123456", notification.Message);
    }

    [Fact]
    public async Task ForgotPassword_Should_Not_Reveal_Unknown_Account()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var handler = new ForgotPasswordHandler(
            dbContext,
            new PasswordHasher(),
            new StubAccountCodeGenerator(),
            Options.Create(new AccountSecurityOptions()));

        var result = await handler.Handle(
            new ForgotPasswordCommand("missing@example.com"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(await dbContext.AccountActionCodes.ToListAsync());
        Assert.Empty(await dbContext.NotificationOutboxMessages.ToListAsync());
    }

    [Fact]
    public async Task ResetPassword_Should_Replace_Password_And_Revoke_Sessions()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        var now = DateTimeOffset.UtcNow;
        var user = CreateVerifiedUser(hasher);
        var code = new AccountActionCode(
            user.Id,
            AccountActionPurpose.ResetPassword,
            hasher.Hash("123456"),
            now.AddMinutes(15),
            now);
        var session = new RefreshTokenSession(
            user.Id,
            "TOKEN_HASH",
            Guid.NewGuid(),
            now.AddDays(30),
            now);
        dbContext.AddRange(user, code, session);
        await dbContext.SaveChangesAsync();

        var handler = new ResetPasswordHandler(
            dbContext,
            hasher,
            Options.Create(new AccountSecurityOptions()));
        var result = await handler.Handle(new ResetPasswordCommand(
            user.EmailAddress,
            "123456",
            "NewSecurePass1",
            "NewSecurePass1"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(ResultStatus.NoContent, result.Status);
        Assert.True(hasher.Verify("NewSecurePass1", user.PasswordHash));
        Assert.NotNull(code.ConsumedAt);
        Assert.NotNull(session.RevokedAt);
    }

    [Fact]
    public async Task ResetPassword_Should_Reject_Invalid_Code()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        var now = DateTimeOffset.UtcNow;
        var user = CreateVerifiedUser(hasher);
        var code = new AccountActionCode(
            user.Id,
            AccountActionPurpose.ResetPassword,
            hasher.Hash("123456"),
            now.AddMinutes(15),
            now);
        dbContext.AddRange(user, code);
        await dbContext.SaveChangesAsync();

        var handler = new ResetPasswordHandler(
            dbContext,
            hasher,
            Options.Create(new AccountSecurityOptions()));
        var result = await handler.Handle(new ResetPasswordCommand(
            user.EmailAddress,
            "654321",
            "NewSecurePass1",
            "NewSecurePass1"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Validation, result.Status);
        Assert.Equal(1, code.FailedAttemptCount);
        Assert.True(hasher.Verify("Owner@12345", user.PasswordHash));
    }

    private static StaffUser CreateVerifiedUser(IPasswordHasher hasher)
    {
        var now = DateTimeOffset.UtcNow;
        var user = new StaffUser(
            "Spinner Owner",
            "owner@spinner.local",
            "09170000000",
            hasher.Hash("Owner@12345"),
            StaffRole.Owner,
            now);
        user.MarkEmailVerifiedForBootstrap(now);
        return user;
    }

    private sealed class StubAccountCodeGenerator : IAccountCodeGenerator
    {
        public string Generate() => "123456";
    }
}
