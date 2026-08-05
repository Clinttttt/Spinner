using Spinner.Api.Common.Time;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Common;

/// <summary>
/// The shop trades in UTC+8, and these conversions are what let a local calendar day
/// be compared against a stored instant inside a database query.
/// </summary>
public sealed class BusinessClockBoundaryTests
{
    private static readonly DateOnly Day = new(2026, 8, 4);

    private static IBusinessClock Clock() => new TestBusinessClock();

    [Fact]
    public void Should_Return_Boundaries_In_Utc()
    {
        var clock = Clock();

        // Not cosmetic. PostgreSQL's "timestamp with time zone" refuses a parameter
        // carrying any offset other than zero, and it refuses it when the value is
        // sent rather than when the query is built — so a boundary returned as +08:00
        // produced a perfectly valid query that failed on execution.
        Assert.Equal(TimeSpan.Zero, clock.StartOfBusinessDay(Day).Offset);
        Assert.Equal(TimeSpan.Zero, clock.EndOfBusinessDay(Day).Offset);
    }

    [Fact]
    public void Should_Start_The_Day_At_Local_Midnight()
    {
        var clock = Clock();

        // Midnight on the 4th in Manila is 16:00 on the 3rd in UTC.
        Assert.Equal(
            new DateTimeOffset(2026, 8, 3, 16, 0, 0, TimeSpan.Zero),
            clock.StartOfBusinessDay(Day));
    }

    [Fact]
    public void Should_End_The_Day_At_The_Start_Of_The_Next_One()
    {
        var clock = Clock();

        Assert.Equal(clock.StartOfBusinessDay(Day.AddDays(1)), clock.EndOfBusinessDay(Day));
    }

    [Fact]
    public void Should_Agree_With_The_Forward_Conversion()
    {
        var clock = Clock();

        var start = clock.StartOfBusinessDay(Day);
        var lastMoment = clock.EndOfBusinessDay(Day).AddTicks(-1);

        // Both ends of the window must resolve back to the same business date, or a
        // day's takings will include or exclude the wrong hours.
        Assert.Equal(Day, clock.ToBusinessDate(start));
        Assert.Equal(Day, clock.ToBusinessDate(lastMoment));
        Assert.Equal(Day.AddDays(1), clock.ToBusinessDate(clock.EndOfBusinessDay(Day)));
    }

    [Fact]
    public void Should_Put_An_Early_Local_Morning_Instant_Inside_The_Window()
    {
        var clock = Clock();

        // 00:30 local, the hour that a UTC-based comparison files under yesterday.
        var justAfterMidnight = new DateTimeOffset(2026, 8, 4, 0, 30, 0, TimeSpan.FromHours(8));

        Assert.True(justAfterMidnight >= clock.StartOfBusinessDay(Day));
        Assert.True(justAfterMidnight < clock.EndOfBusinessDay(Day));
    }
}
