using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;

namespace Spinner.Test.Domain.Users;

/// <summary>
/// Failed sign-ins were not counted at all, so one account could be guessed at
/// indefinitely. Rate limiting slows one caller down; this makes a spread-out
/// attempt against a single account expensive too.
/// </summary>
public sealed class LoginLockoutTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 4, 9, 0, 0, TimeSpan.FromHours(8));
    private static readonly AccountSecurityOptions Options = new();

    private static StaffUser CreateUser() =>
        new("Clint Villanueva", "owner@spinner.test", "09171234567", "hash", StaffRole.Owner, Now);

    [Fact]
    public void Should_Not_Lock_An_Account_Before_The_Limit()
    {
        var user = CreateUser();

        for (var attempt = 1; attempt < Options.MaxFailedLoginAttempts; attempt++)
            Fail(user);

        // Mistyping a password a few times is normal and must not lock the shop out
        // in the middle of a working day.
        Assert.False(user.IsLockedOut(Now));
    }

    [Fact]
    public void Should_Lock_The_Account_On_The_Final_Attempt()
    {
        var user = CreateUser();

        for (var attempt = 0; attempt < Options.MaxFailedLoginAttempts; attempt++)
            Fail(user);

        Assert.True(user.IsLockedOut(Now));
    }

    [Fact]
    public void Should_Release_The_Lock_Once_It_Expires()
    {
        var user = CreateUser();

        for (var attempt = 0; attempt < Options.MaxFailedLoginAttempts; attempt++)
            Fail(user);

        // Temporary on purpose: a permanent lock would let somebody else's guessing
        // shut the owner out of their own shop.
        var afterLock = Now.AddMinutes(Options.LoginLockoutMinutes + 1);

        Assert.False(user.IsLockedOut(afterLock));
    }

    [Fact]
    public void Should_Forget_Earlier_Failures_After_A_Successful_Sign_In()
    {
        var user = CreateUser();
        Fail(user);
        Fail(user);

        user.RecordSuccessfulLogin(Now);

        Assert.Equal(0, user.FailedLoginCount);
        Assert.False(user.IsLockedOut(Now));
    }

    [Fact]
    public void Should_Clear_The_Counter_When_The_Lock_Is_Applied()
    {
        var user = CreateUser();

        for (var attempt = 0; attempt < Options.MaxFailedLoginAttempts; attempt++)
            Fail(user);

        // Otherwise every single attempt after the first lockout would re-lock
        // immediately, turning a temporary lock into a permanent one.
        Assert.Equal(0, user.FailedLoginCount);
    }

    private static void Fail(StaffUser user) =>
        user.RecordFailedLogin(Now, Options.MaxFailedLoginAttempts, Options.LoginLockoutMinutes);
}
