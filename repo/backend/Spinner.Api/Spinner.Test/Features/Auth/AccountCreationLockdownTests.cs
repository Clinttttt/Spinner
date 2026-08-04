using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Auth.Register;
using Spinner.Api.Features.Staff.InviteStaff;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Auth;

/// <summary>
/// Account creation used to be open: anyone who could reach the API could register,
/// and every account created was an Owner. These tests hold the gate shut.
/// </summary>
public sealed class AccountCreationLockdownTests
{
    private static readonly AccountSecurityOptions Options = new();

    [Fact]
    public async Task Should_Let_The_Very_First_Account_Become_The_Owner()
    {
        await using var dbContext = AppDbContextFactory.Create();

        // Nobody can invite the shop's first account, so this one case stays open.
        var result = await Register(dbContext, "owner@spinner.test", "09171234567");

        Assert.True(result.IsSuccess);
        var user = await dbContext.StaffUsers.SingleAsync();
        Assert.Equal(StaffRole.Owner, user.Role);
    }

    [Fact]
    public async Task Should_Refuse_A_Second_Account_Without_An_Invitation()
    {
        await using var dbContext = AppDbContextFactory.Create();
        Assert.True((await Register(dbContext, "owner@spinner.test", "09171234567")).IsSuccess);

        var result = await Register(dbContext, "stranger@example.com", "09990001111");

        Assert.False(result.IsSuccess);
        Assert.Equal(1, await dbContext.StaffUsers.CountAsync());
    }

    [Fact]
    public async Task Should_Not_Hand_Out_A_Second_Owner_Account()
    {
        await using var dbContext = AppDbContextFactory.Create();
        Assert.True((await Register(dbContext, "owner@spinner.test", "09171234567")).IsSuccess);
        var owner = await dbContext.StaffUsers.SingleAsync();

        var invite = await Invite(dbContext, owner.Id, "helper@spinner.test", StaffRole.Staff);
        var result = await Register(
            dbContext,
            "helper@spinner.test",
            "09990001111",
            invite.Value!.InvitationCode);

        Assert.True(result.IsSuccess);
        var created = await dbContext.StaffUsers
            .SingleAsync(user => user.EmailAddress == "helper@spinner.test");
        Assert.Equal(StaffRole.Staff, created.Role);
    }

    [Fact]
    public async Task Should_Refuse_An_Invitation_Issued_For_A_Different_Email()
    {
        await using var dbContext = AppDbContextFactory.Create();
        Assert.True((await Register(dbContext, "owner@spinner.test", "09171234567")).IsSuccess);
        var owner = await dbContext.StaffUsers.SingleAsync();

        var invite = await Invite(dbContext, owner.Id, "helper@spinner.test", StaffRole.Staff);

        // A leaked code must not let somebody else in.
        var result = await Register(
            dbContext,
            "attacker@example.com",
            "09990001111",
            invite.Value!.InvitationCode);

        Assert.False(result.IsSuccess);
        Assert.Equal(1, await dbContext.StaffUsers.CountAsync());
    }

    [Fact]
    public async Task Should_Not_Let_One_Invitation_Create_Two_Accounts()
    {
        await using var dbContext = AppDbContextFactory.Create();
        Assert.True((await Register(dbContext, "owner@spinner.test", "09171234567")).IsSuccess);
        var owner = await dbContext.StaffUsers.SingleAsync();

        var invite = await Invite(dbContext, owner.Id, "helper@spinner.test", StaffRole.Staff);
        var code = invite.Value!.InvitationCode;

        Assert.True((await Register(dbContext, "helper@spinner.test", "09990001111", code)).IsSuccess);

        // The account now exists, so a replay is refused on that ground; the
        // invitation is also marked accepted so it cannot be used again.
        var replay = await Register(dbContext, "helper@spinner.test", "09990002222", code);

        Assert.False(replay.IsSuccess);
        var invitation = await dbContext.StaffInvitations.SingleAsync();
        Assert.NotNull(invitation.AcceptedAt);
    }

    [Fact]
    public async Task Should_Refuse_An_Expired_Invitation()
    {
        await using var dbContext = AppDbContextFactory.Create();
        Assert.True((await Register(dbContext, "owner@spinner.test", "09171234567")).IsSuccess);
        var owner = await dbContext.StaffUsers.SingleAsync();

        var invite = await Invite(dbContext, owner.Id, "helper@spinner.test", StaffRole.Staff);

        var invitation = await dbContext.StaffInvitations.SingleAsync();
        dbContext.Entry(invitation).Property(nameof(StaffInvitation.ExpiresAt)).CurrentValue =
            DateTimeOffset.UtcNow.AddMinutes(-1);
        await dbContext.SaveChangesAsync();

        var result = await Register(
            dbContext,
            "helper@spinner.test",
            "09990001111",
            invite.Value!.InvitationCode);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Should_Refuse_A_Revoked_Invitation()
    {
        await using var dbContext = AppDbContextFactory.Create();
        Assert.True((await Register(dbContext, "owner@spinner.test", "09171234567")).IsSuccess);
        var owner = await dbContext.StaffUsers.SingleAsync();

        var invite = await Invite(dbContext, owner.Id, "helper@spinner.test", StaffRole.Staff);
        var invitation = await dbContext.StaffInvitations.SingleAsync();
        invitation.Revoke(DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync();

        var result = await Register(
            dbContext,
            "helper@spinner.test",
            "09990001111",
            invite.Value!.InvitationCode);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Should_Count_Failed_Attempts_So_A_Code_Cannot_Be_Guessed_Forever()
    {
        await using var dbContext = AppDbContextFactory.Create();
        Assert.True((await Register(dbContext, "owner@spinner.test", "09171234567")).IsSuccess);
        var owner = await dbContext.StaffUsers.SingleAsync();

        var invite = await Invite(dbContext, owner.Id, "helper@spinner.test", StaffRole.Staff);

        for (var attempt = 0; attempt < Options.MaxCodeAttempts; attempt++)
        {
            var wrong = await Register(dbContext, "helper@spinner.test", "09990001111", "000000");
            Assert.False(wrong.IsSuccess);
        }

        var invitation = await dbContext.StaffInvitations.SingleAsync();
        Assert.Equal(Options.MaxCodeAttempts, invitation.FailedAttemptCount);

        // Even the correct code is refused once the attempts are spent.
        var result = await Register(
            dbContext,
            "helper@spinner.test",
            "09990001111",
            invite.Value!.InvitationCode);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Should_Replace_An_Earlier_Invitation_For_The_Same_Person()
    {
        await using var dbContext = AppDbContextFactory.Create();
        Assert.True((await Register(dbContext, "owner@spinner.test", "09171234567")).IsSuccess);
        var owner = await dbContext.StaffUsers.SingleAsync();

        var first = await Invite(dbContext, owner.Id, "helper@spinner.test", StaffRole.Staff);
        var second = await Invite(dbContext, owner.Id, "helper@spinner.test", StaffRole.Staff);

        // Re-inviting must not leave two working codes behind.
        var stale = await Register(
            dbContext,
            "helper@spinner.test",
            "09990001111",
            first.Value!.InvitationCode);
        Assert.False(stale.IsSuccess);

        var current = await Register(
            dbContext,
            "helper@spinner.test",
            "09990001111",
            second.Value!.InvitationCode);
        Assert.True(current.IsSuccess);
    }

    [Fact]
    public async Task Should_Refuse_To_Invite_Somebody_Who_Already_Has_An_Account()
    {
        await using var dbContext = AppDbContextFactory.Create();
        Assert.True((await Register(dbContext, "owner@spinner.test", "09171234567")).IsSuccess);
        var owner = await dbContext.StaffUsers.SingleAsync();

        var result = await Invite(dbContext, owner.Id, "owner@spinner.test", StaffRole.Staff);

        Assert.False(result.IsSuccess);
    }

    private static Task<Result<RegisterResponse>> Register(
        AppDbContext dbContext,
        string email,
        string mobile,
        string? invitationCode = null) =>
        new RegisterHandler(
                dbContext,
                new PasswordHasher(),
                new AccountCodeGenerator(),
                new OptionsWrapper<AccountSecurityOptions>(Options))
            .Handle(
                new RegisterCommand(
                    "Test Person",
                    email,
                    mobile,
                    "Sup3rSecret!",
                    "Sup3rSecret!",
                    invitationCode),
                CancellationToken.None);

    private static Task<Result<InviteStaffResponse>> Invite(
        AppDbContext dbContext,
        Guid invitedBy,
        string email,
        StaffRole role) =>
        new InviteStaffHandler(
                dbContext,
                new PasswordHasher(),
                new AccountCodeGenerator(),
                new OptionsWrapper<AccountSecurityOptions>(Options))
            .Handle(new InviteStaffCommand(invitedBy, email, role), CancellationToken.None);
}
