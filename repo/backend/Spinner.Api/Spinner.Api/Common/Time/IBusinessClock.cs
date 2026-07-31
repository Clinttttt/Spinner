namespace Spinner.Api.Common.Time;

/// <summary>
/// Supplies the current instant and the current business calendar date.
/// The business calendar date must never be derived from <see cref="DateTime.UtcNow"/>
/// directly: the laundromat operates in a UTC+8 time zone, so UTC would resolve
/// "today" to the previous day between 00:00 and 07:59 local time.
/// </summary>
public interface IBusinessClock
{
    DateTimeOffset Now { get; }

    DateOnly Today { get; }

    DateOnly ToBusinessDate(DateTimeOffset instant);
}
