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
