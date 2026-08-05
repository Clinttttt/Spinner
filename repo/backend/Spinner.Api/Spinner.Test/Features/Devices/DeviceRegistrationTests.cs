using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Devices.RegisterDevice;
using Spinner.Api.Features.Devices.ReleaseDevice;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Devices;

/// <summary>
/// Which phones the shop sends its alerts to. The awkward case is a shared counter
/// phone: the token belongs to the handset, not to whoever happens to be signed in.
/// </summary>
public sealed class DeviceRegistrationTests
{
    private const string Token = "fcm-token-abc123";

    [Fact]
    public async Task Should_Register_A_Device()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = await AddUserAsync(dbContext, "owner@spinner.test");

        var result = await Register(dbContext, user.Id, Token);

        Assert.True(result.IsSuccess);
        var device = await dbContext.StaffDevices.SingleAsync();
        Assert.Equal(user.Id, device.UserId);
        Assert.True(device.IsActive);
    }

    [Fact]
    public async Task Should_Not_Store_The_Same_Phone_Twice()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = await AddUserAsync(dbContext, "owner@spinner.test");

        // Registration happens on every sign-in, because the operating system can rotate
        // the token at any time. Repeating it must not accumulate rows.
        await Register(dbContext, user.Id, Token);
        await Register(dbContext, user.Id, Token);

        Assert.Equal(1, await dbContext.StaffDevices.CountAsync());
    }

    [Fact]
    public async Task Should_Move_A_Shared_Phone_To_Whoever_Signs_In()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var owner = await AddUserAsync(dbContext, "owner@spinner.test");
        var staff = await AddUserAsync(dbContext, "helper@spinner.test", "09990001111");

        await Register(dbContext, owner.Id, Token);
        await Register(dbContext, staff.Id, Token);

        // One handset, one row, now belonging to the person actually using it. Storing it
        // twice would send two notifications to the same phone for one booking.
        var device = await dbContext.StaffDevices.SingleAsync();
        Assert.Equal(staff.Id, device.UserId);
    }

    [Fact]
    public async Task Should_Bring_A_Released_Phone_Back_When_It_Signs_In_Again()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = await AddUserAsync(dbContext, "owner@spinner.test");

        await Register(dbContext, user.Id, Token);
        await Release(dbContext, user.Id, Token);
        await Register(dbContext, user.Id, Token);

        var device = await dbContext.StaffDevices.SingleAsync();
        Assert.True(device.IsActive);
        Assert.Null(device.RetiredAt);
    }

    [Fact]
    public async Task Should_Stop_Sending_To_A_Phone_That_Signed_Out()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = await AddUserAsync(dbContext, "owner@spinner.test");

        await Register(dbContext, user.Id, Token);
        var result = await Release(dbContext, user.Id, Token);

        Assert.True(result.IsSuccess);
        var device = await dbContext.StaffDevices.SingleAsync();
        Assert.False(device.IsActive);
    }

    [Fact]
    public async Task Should_Not_Let_One_Account_Release_Another_Account_Phone()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var owner = await AddUserAsync(dbContext, "owner@spinner.test");
        var staff = await AddUserAsync(dbContext, "helper@spinner.test", "09990001111");

        await Register(dbContext, owner.Id, Token);
        await Release(dbContext, staff.Id, Token);

        // Reported as success because signing out should never fail, but the owner's
        // phone must keep working.
        var device = await dbContext.StaffDevices.SingleAsync();
        Assert.True(device.IsActive);
    }

    [Fact]
    public async Task Should_Succeed_Quietly_When_Releasing_Something_Unknown()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = await AddUserAsync(dbContext, "owner@spinner.test");

        var result = await Release(dbContext, user.Id, "never-registered");

        Assert.True(result.IsSuccess);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Should_Refuse_An_Empty_Token(string token)
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = await AddUserAsync(dbContext, "owner@spinner.test");

        var result = await Register(dbContext, user.Id, token);

        Assert.False(result.IsSuccess);
        Assert.Equal(0, await dbContext.StaffDevices.CountAsync());
    }

    [Fact]
    public async Task Should_Refuse_An_Absurdly_Long_Token()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var user = await AddUserAsync(dbContext, "owner@spinner.test");

        var result = await Register(dbContext, user.Id, new string('a', 600));

        Assert.False(result.IsSuccess);
    }

    private static async Task<StaffUser> AddUserAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        string email,
        string mobile = "09171234567")
    {
        var user = new StaffUser(
            "Test Person",
            email,
            mobile,
            "hash",
            StaffRole.Owner,
            DateTimeOffset.UtcNow);

        dbContext.StaffUsers.Add(user);
        await dbContext.SaveChangesAsync();

        return user;
    }

    private static Task<Result> Register(
        Spinner.Api.Database.AppDbContext dbContext,
        Guid userId,
        string token) =>
        new RegisterDeviceHandler(dbContext).Handle(
            new RegisterDeviceCommand(userId, token, DevicePlatform.Android, "Counter phone"),
            CancellationToken.None);

    private static Task<Result> Release(
        Spinner.Api.Database.AppDbContext dbContext,
        Guid userId,
        string token) =>
        new ReleaseDeviceHandler(dbContext).Handle(
            new ReleaseDeviceCommand(userId, token),
            CancellationToken.None);
}
