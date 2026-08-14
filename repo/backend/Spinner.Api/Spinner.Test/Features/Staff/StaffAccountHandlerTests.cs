using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Staff.GetStaffAccounts;
using Spinner.Api.Features.Staff.SetStaffAccountActive;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Staff;

public sealed class StaffAccountHandlerTests
{
    [Fact]
    public async Task GetStaffAccounts_Should_List_Active_Accounts_First()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var owner = User("Zoe Owner", "zoe@example.com", StaffRole.Owner);
        var leaver = User("Adam Leaver", "adam@example.com", StaffRole.Staff);
        leaver.Deactivate(DateTimeOffset.UtcNow);
        dbContext.StaffUsers.AddRange(owner, leaver);
        await dbContext.SaveChangesAsync();

        var result = await new GetStaffAccountsHandler(dbContext).Handle(
            new GetStaffAccountsQuery(),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        // Whoever can currently get in belongs at the top, even though "Adam" sorts first.
        Assert.Equal(["Zoe Owner", "Adam Leaver"], result.Value!.Select(item => item.FullName));
    }

    [Fact]
    public async Task Deactivate_Should_Withdraw_Access_And_Revoke_Sessions()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var owner = User("Owner", "owner@example.com", StaffRole.Owner);
        var staff = User("Staff", "staff@example.com", StaffRole.Staff);
        dbContext.StaffUsers.AddRange(owner, staff);
        dbContext.RefreshTokenSessions.Add(new RefreshTokenSession(
            staff.Id,
            "TOKEN_HASH",
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddDays(30),
            DateTimeOffset.UtcNow));
        await dbContext.SaveChangesAsync();

        var result = await Handler(dbContext).Handle(
            new SetStaffAccountActiveCommand(owner.Id, staff.Id, IsActive: false),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value!.IsActive);
        // Access has to end now, not when the access token expires.
        var session = await dbContext.RefreshTokenSessions.SingleAsync();
        Assert.NotNull(session.RevokedAt);
    }

    [Fact]
    public async Task Deactivate_Should_Refuse_Your_Own_Account()
    {
        // Otherwise an owner can lock themselves out of the only app that can let them back in.
        await using var dbContext = AppDbContextFactory.Create();
        var owner = User("Owner", "owner@example.com", StaffRole.Owner);
        var second = User("Second Owner", "second@example.com", StaffRole.Owner);
        dbContext.StaffUsers.AddRange(owner, second);
        await dbContext.SaveChangesAsync();

        var result = await Handler(dbContext).Handle(
            new SetStaffAccountActiveCommand(owner.Id, owner.Id, IsActive: false),
            CancellationToken.None);

        Assert.Equal(ResultStatus.Validation, result.Status);
        Assert.Contains("your own account", result.Error.Message);
    }

    [Fact]
    public async Task Deactivate_Should_Refuse_The_Last_Active_Owner()
    {
        // The shop must always have someone who can manage staff, prices and settings.
        await using var dbContext = AppDbContextFactory.Create();
        var owner = User("Only Owner", "only@example.com", StaffRole.Owner);
        var staff = User("Staff", "staff@example.com", StaffRole.Staff);
        dbContext.StaffUsers.AddRange(owner, staff);
        await dbContext.SaveChangesAsync();

        var result = await Handler(dbContext).Handle(
            new SetStaffAccountActiveCommand(staff.Id, owner.Id, IsActive: false),
            CancellationToken.None);

        Assert.Equal(ResultStatus.Validation, result.Status);
        Assert.Contains("only active owner", result.Error.Message);
        Assert.True((await dbContext.StaffUsers.SingleAsync(u => u.Id == owner.Id)).IsActive);
    }

    [Fact]
    public async Task Deactivate_Should_Allow_A_Spare_Owner_While_Another_Remains()
    {
        // The case this was built for: a second owner account nobody needs any more.
        await using var dbContext = AppDbContextFactory.Create();
        var realOwner = User("Real Owner", "real@example.com", StaffRole.Owner);
        var spareOwner = User("Spare Owner", "spare@example.com", StaffRole.Owner);
        dbContext.StaffUsers.AddRange(realOwner, spareOwner);
        await dbContext.SaveChangesAsync();

        var result = await Handler(dbContext).Handle(
            new SetStaffAccountActiveCommand(realOwner.Id, spareOwner.Id, IsActive: false),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value!.IsActive);
    }

    [Fact]
    public async Task Activate_Should_Restore_Access_And_Clear_Any_Lockout()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var owner = User("Owner", "owner@example.com", StaffRole.Owner);
        var returning = User("Returning", "returning@example.com", StaffRole.Staff);
        returning.RecordFailedLogin(DateTimeOffset.UtcNow, maxAttempts: 1, lockoutMinutes: 60);
        returning.Deactivate(DateTimeOffset.UtcNow);
        dbContext.StaffUsers.AddRange(owner, returning);
        await dbContext.SaveChangesAsync();

        var result = await Handler(dbContext).Handle(
            new SetStaffAccountActiveCommand(owner.Id, returning.Id, IsActive: true),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value!.IsActive);
        // A returning member should not inherit a lockout from whenever they left.
        Assert.False(returning.IsLockedOut(DateTimeOffset.UtcNow));
    }

    [Fact]
    public async Task Deactivate_Should_Report_An_Unknown_Account()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var owner = User("Owner", "owner@example.com", StaffRole.Owner);
        dbContext.StaffUsers.Add(owner);
        await dbContext.SaveChangesAsync();

        var result = await Handler(dbContext).Handle(
            new SetStaffAccountActiveCommand(owner.Id, Guid.NewGuid(), IsActive: false),
            CancellationToken.None);

        Assert.Equal(ResultStatus.NotFound, result.Status);
    }

    private static SetStaffAccountActiveHandler Handler(Spinner.Api.Database.AppDbContext dbContext) =>
        new(dbContext);

    private static StaffUser User(string name, string email, StaffRole role) =>
        new(name, email, null, new PasswordHasher().Hash("Owner@12345"), role, DateTimeOffset.UtcNow);
}
