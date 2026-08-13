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
            "SecurePass1", null), CancellationToken.None);

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
            "SecurePass1", null), CancellationToken.None);

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
            "SecurePass1", null), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
        Assert.Single(await dbContext.StaffUsers.ToListAsync());
        Assert.Empty(await dbContext.RefreshTokenSessions.ToListAsync());
    }

    [Fact]
    public async Task Register_Should_Accept_An_Invited_Staff_Member()
    {
        // The invitation path was unreachable in the running app: the controller built the
        // command without the code, and because the parameter had a default the compiler
        // accepted it. Every invited staff member was told a code was required while holding
        // a good one. The command now takes the argument explicitly, so that omission is a
        // build error, and this covers the path itself.
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        var owner = CreateExistingUser(hasher);
        dbContext.StaffUsers.Add(owner);
        dbContext.StaffInvitations.Add(new StaffInvitation(
            "helper@example.com",
            StaffRole.Staff,
            hasher.Hash("398595"),
            owner.Id,
            DateTimeOffset.UtcNow.AddDays(7),
            DateTimeOffset.UtcNow));
        await dbContext.SaveChangesAsync();

        var result = await CreateHandler(dbContext, hasher).Handle(new RegisterCommand(
            "Helpful Person",
            "helper@example.com",
            "09171112222",
            "SecurePass1",
            "SecurePass1",
            "398595"), CancellationToken.None);

        Assert.True(result.IsSuccess);

        var created = await dbContext.StaffUsers
            .SingleAsync(user => user.EmailAddress == "helper@example.com");

        // Invited accounts take the role the invitation carried, not Owner.
        Assert.Equal(StaffRole.Staff, created.Role);

        // The invitation is single use, so it must be spent.
        var invitation = await dbContext.StaffInvitations.SingleAsync();
        Assert.NotNull(invitation.AcceptedAt);
        Assert.Equal(created.Id, invitation.AcceptedByUserId);
    }

    [Fact]
    public async Task Register_Should_Reject_A_Code_Issued_For_Another_Email()
    {
        // The whole point of tying a code to an address: a leaked code is useless to anyone
        // it was not sent to.
        await using var dbContext = AppDbContextFactory.Create();
        var hasher = new PasswordHasher();
        var owner = CreateExistingUser(hasher);
        dbContext.StaffUsers.Add(owner);
        dbContext.StaffInvitations.Add(new StaffInvitation(
            "helper@example.com",
            StaffRole.Staff,
            hasher.Hash("398595"),
            owner.Id,
            DateTimeOffset.UtcNow.AddDays(7),
            DateTimeOffset.UtcNow));
        await dbContext.SaveChangesAsync();

        var result = await CreateHandler(dbContext, hasher).Handle(new RegisterCommand(
            "Somebody Else",
            "stranger@example.com",
            "09173334444",
            "SecurePass1",
            "SecurePass1",
            "398595"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Single(await dbContext.StaffUsers.ToListAsync());
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
