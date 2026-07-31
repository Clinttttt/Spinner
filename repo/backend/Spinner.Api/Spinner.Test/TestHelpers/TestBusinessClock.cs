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
}
