using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Auth.ChangePassword;
using Spinner.Api.Features.Auth.GetCurrentAccount;
using Spinner.Api.Features.Auth.UpdateAccountProfile;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Auth;

public sealed class AccountProfileHandlerTests
{
    [Fact]
    public async Task GetCurrentAccount_Should_Return_Authenticated_User()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = CreateUser();
        dbContext.StaffUsers.Add(user);
        await dbContext.SaveChangesAsync();

        var handler = new GetCurrentAccountHandler(dbContext);
        var result = await handler.Handle(
            new GetCurrentAccountQuery(user.Id),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(user.Id, result.Value!.Id);
        Assert.Equal(user.EmailAddress, result.Value.EmailAddress);
    }

    [Fact]
    public async Task UpdateProfile_Should_Normalize_And_Persist_Account_Details()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = CreateUser();
        dbContext.StaffUsers.Add(user);
        await dbContext.SaveChangesAsync();

        var handler = CreateUpdateHandler(dbContext);
        var result = await handler.Handle(
            new UpdateAccountProfileCommand(
                user.Id,
                "  Clint Owner  ",
                "CLINT@EXAMPLE.COM",
                " 09171234567 "),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Clint Owner", result.Value!.FullName);
        Assert.Equal("clint@example.com", result.Value.EmailAddress);
        Assert.Equal("09171234567", result.Value.MobileNumber);
        Assert.False(result.Value.IsEmailVerified);

        var persisted = await dbContext.StaffUsers.SingleAsync();
        Assert.Equal("Clint Owner", persisted.FullName);
        Assert.Equal("clint@example.com", persisted.EmailAddress);
        Assert.Single(await dbContext.AccountActionCodes.ToListAsync());
        Assert.Single(await dbContext.NotificationOutboxMessages.ToListAsync());
    }

    [Fact]
    public async Task UpdateProfile_Should_Return_Conflict_For_Duplicate_Email()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = CreateUser();
        var otherUser = new StaffUser(
            "Other Staff",
            "other@example.com",
            null,
            new PasswordHasher().Hash("Other@12345"),
            StaffRole.Staff,
            DateTimeOffset.UtcNow);
        dbContext.StaffUsers.AddRange(user, otherUser);
        await dbContext.SaveChangesAsync();

        var handler = CreateUpdateHandler(dbContext);
        var result = await handler.Handle(
            new UpdateAccountProfileCommand(
                user.Id,
                user.FullName,
                otherUser.EmailAddress,
                user.MobileNumber),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task ChangePassword_Should_Reject_Incorrect_Current_Password()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = CreateUser();
        dbContext.StaffUsers.Add(user);
        await dbContext.SaveChangesAsync();

        var handler = new ChangePasswordHandler(dbContext, new PasswordHasher());
        var result = await handler.Handle(
            new ChangePasswordCommand(user.Id, "wrong-password", "NewOwner@12345"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Validation, result.Status);
    }

    [Fact]
    public async Task ChangePassword_Should_Replace_Stored_Hash()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = CreateUser();
        dbContext.StaffUsers.Add(user);
        await dbContext.SaveChangesAsync();
        var hasher = new PasswordHasher();

        var handler = new ChangePasswordHandler(dbContext, hasher);
        var result = await handler.Handle(
            new ChangePasswordCommand(user.Id, "Owner@12345", "NewOwner@12345"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(ResultStatus.NoContent, result.Status);
        Assert.True(hasher.Verify("NewOwner@12345", user.PasswordHash));
        Assert.False(hasher.Verify("Owner@12345", user.PasswordHash));
    }

    [Fact]
    public async Task ChangePassword_Should_Revoke_All_Refresh_Sessions()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = CreateUser();
        var session = new RefreshTokenSession(
            user.Id,
            "TOKEN_HASH",
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddDays(30),
            DateTimeOffset.UtcNow);
        dbContext.AddRange(user, session);
        await dbContext.SaveChangesAsync();

        var handler = new ChangePasswordHandler(dbContext, new PasswordHasher());
        var result = await handler.Handle(
            new ChangePasswordCommand(
                user.Id,
                "Owner@12345",
                "NewOwner@12345"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(session.RevokedAt);
    }

    private static StaffUser CreateUser()
    {
        var hasher = new PasswordHasher();
        return new StaffUser(
            "Spinner Owner",
            "owner@spinner.local",
            "09170000000",
            hasher.Hash("Owner@12345"),
            StaffRole.Owner,
            DateTimeOffset.UtcNow);
    }

    private static UpdateAccountProfileHandler CreateUpdateHandler(
        Spinner.Api.Database.AppDbContext dbContext) =>
        new(
            dbContext,
            new PasswordHasher(),
            new StubAccountCodeGenerator(),
            Options.Create(new AccountSecurityOptions()));

    private sealed class StubAccountCodeGenerator : IAccountCodeGenerator
    {
        public string Generate() => "123456";
    }
}
