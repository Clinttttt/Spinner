using Microsoft.Extensions.Options;
using Spinner.Api.Common.Time;

namespace Spinner.Test.Common.Time;

public sealed class BusinessClockTests
{
    [Fact]
    public void Today_Should_Use_The_Business_Time_Zone_Not_Utc()
    {
        // 2026-07-30 23:30 UTC is already 2026-07-31 in a UTC+8 shop.
        var instant = new DateTimeOffset(2026, 7, 30, 23, 30, 0, TimeSpan.Zero);
        var clock = CreateClock("Asia/Manila");

        Assert.Equal(new DateOnly(2026, 7, 31), clock.ToBusinessDate(instant));
    }

    [Fact]
    public void Early_Local_Morning_Should_Not_Resolve_To_Yesterday()
    {
        // 2026-07-30 00:30 local (+08:00) is 2026-07-29 16:30 UTC.
        var instant = new DateTimeOffset(2026, 7, 29, 16, 30, 0, TimeSpan.Zero);
        var clock = CreateClock("Asia/Manila");

        Assert.Equal(new DateOnly(2026, 7, 30), clock.ToBusinessDate(instant));
    }

    [Fact]
    public void Unknown_Time_Zone_Should_Fall_Back_To_Plus_Eight()
    {
        var instant = new DateTimeOffset(2026, 7, 30, 23, 30, 0, TimeSpan.Zero);
        var clock = CreateClock("Not/ARealZone");

        Assert.Equal(new DateOnly(2026, 7, 31), clock.ToBusinessDate(instant));
    }

    private static BusinessClock CreateClock(string timeZone) =>
        new(Options.Create(new BusinessTimeOptions { TimeZone = timeZone }));
}
