using Spinner.Api.Common.Time;

namespace Spinner.Test.TestHelpers;

public sealed class TestBusinessClock : IBusinessClock
{
    private readonly TimeZoneInfo _timeZone;

    public TestBusinessClock(DateTimeOffset? now = null, TimeZoneInfo? timeZone = null)
    {
        Now = now ?? DateTimeOffset.UtcNow;
        _timeZone = timeZone ?? BusinessTimeOptions.FallbackTimeZone;
    }

    public DateTimeOffset Now { get; set; }

    public DateOnly Today => ToBusinessDate(Now);

    public DateOnly ToBusinessDate(DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, _timeZone).Date);

    public DateTimeOffset StartOfBusinessDay(DateOnly businessDate)
    {
        var localMidnight = businessDate.ToDateTime(TimeOnly.MinValue);
        var offset = _timeZone.GetUtcOffset(
            DateTime.SpecifyKind(localMidnight, DateTimeKind.Unspecified));

        // UTC, matching the real clock: PostgreSQL rejects a timestamptz parameter that
        // carries any other offset.
        return new DateTimeOffset(localMidnight, offset).ToUniversalTime();
    }

    public DateTimeOffset EndOfBusinessDay(DateOnly businessDate) =>
        StartOfBusinessDay(businessDate.AddDays(1));
}
