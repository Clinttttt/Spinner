using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Auth.Register;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Auth;

public sealed class RegisterHandlerTests
{
    [Fact]
    public async Task Register_Should_Create_Unverified_Owner_And_Queue_Verification()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        var handler = CreateHandler(dbContext, hasher);

        var result = await handler.Handle(new RegisterCommand(
            "  Maria Santos  ",
            "  MARIA@EXAMPLE.COM ",
            "09171234567",
            "SecurePass1",
            "SecurePass1"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("maria@example.com", result.Value!.EmailAddress);
        Assert.True(result.Value.VerificationRequired);
        Assert.Equal(15, result.Value.CodeExpiresInMinutes);

        var user = await dbContext.StaffUsers.SingleAsync();
        Assert.False(user.IsEmailVerified);
        Assert.Equal("09171234567", user.MobileNumber);
        Assert.True(hasher.Verify("SecurePass1", user.PasswordHash));
        Assert.Empty(await dbContext.RefreshTokenSessions.ToListAsync());
        Assert.Single(await dbContext.AccountActionCodes.ToListAsync());
        var notification = Assert.Single(
            await dbContext.NotificationOutboxMessages.ToListAsync());
        Assert.Null(notification.OrderId);
        Assert.Contains("123456", notification.Message);
    }

    [Fact]
    public async Task Register_Should_Return_Conflict_When_Email_Already_Exists()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        dbContext.StaffUsers.Add(CreateExistingUser(hasher));
        await dbContext.SaveChangesAsync();
        var handler = CreateHandler(dbContext, hasher);

        var result = await handler.Handle(new RegisterCommand(
            "Another Owner",
            "OWNER@SPINNER.LOCAL",
            "09179999999",
            "SecurePass1",
            "SecurePass1"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
        Assert.Single(await dbContext.StaffUsers.ToListAsync());
        Assert.Empty(await dbContext.RefreshTokenSessions.ToListAsync());
    }

    [Fact]
    public async Task Register_Should_Return_Conflict_When_Mobile_Already_Exists()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        dbContext.StaffUsers.Add(CreateExistingUser(hasher));
        await dbContext.SaveChangesAsync();
        var handler = CreateHandler(dbContext, hasher);

        var result = await handler.Handle(new RegisterCommand(
            "Another Owner",
            "another@example.com",
            "09170000000",
            "SecurePass1",
            "SecurePass1"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
        Assert.Single(await dbContext.StaffUsers.ToListAsync());
        Assert.Empty(await dbContext.RefreshTokenSessions.ToListAsync());
    }

    private static StaffUser CreateExistingUser(IPasswordHasher hasher) =>
        new(
            "Spinner Owner",
            "owner@spinner.local",
            "09170000000",
            hasher.Hash("Owner@12345"),
            StaffRole.Owner,
            DateTimeOffset.UtcNow);

    private static RegisterHandler CreateHandler(
        Spinner.Api.Database.AppDbContext dbContext,
        IPasswordHasher passwordHasher)
    {
        return new RegisterHandler(
            dbContext,
            passwordHasher,
            new StubAccountCodeGenerator(),
            Options.Create(new AccountSecurityOptions()));
    }

    private sealed class StubAccountCodeGenerator : IAccountCodeGenerator
    {
        public string Generate() => "123456";
    }
}
