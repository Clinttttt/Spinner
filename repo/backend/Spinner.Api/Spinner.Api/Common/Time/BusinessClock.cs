using Microsoft.Extensions.Options;

namespace Spinner.Api.Common.Time;

public sealed class BusinessClock : IBusinessClock
{
    private readonly TimeZoneInfo _timeZone;

    public BusinessClock(IOptions<BusinessTimeOptions> options)
    {
        _timeZone = ResolveTimeZone(options.Value.TimeZone);
    }

    public DateTimeOffset Now => DateTimeOffset.UtcNow;

    public DateOnly Today => ToBusinessDate(Now);

    public DateOnly ToBusinessDate(DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, _timeZone).Date);

    public DateTimeOffset StartOfBusinessDay(DateOnly businessDate)
    {
        var localMidnight = businessDate.ToDateTime(TimeOnly.MinValue);

        // GetUtcOffset is asked about the local time itself rather than a fixed offset,
        // so a zone that ever changes its offset still resolves the right instant.
        var offset = _timeZone.GetUtcOffset(
            DateTime.SpecifyKind(localMidnight, DateTimeKind.Unspecified));

        // Returned as UTC. The instant is the same either way, but PostgreSQL's
        // "timestamp with time zone" only accepts a parameter whose offset is zero and
        // rejects anything else outright, so a value carrying +08:00 fails at the point
        // it is sent — after the query has been built, which is why it looked like a
        // working query.
        return new DateTimeOffset(localMidnight, offset).ToUniversalTime();
    }

    public DateTimeOffset EndOfBusinessDay(DateOnly businessDate) =>
        StartOfBusinessDay(businessDate.AddDays(1));

    private static TimeZoneInfo ResolveTimeZone(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
            return BusinessTimeOptions.FallbackTimeZone;

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return BusinessTimeOptions.FallbackTimeZone;
        }
        catch (InvalidTimeZoneException)
        {
            return BusinessTimeOptions.FallbackTimeZone;
        }
    }
}
