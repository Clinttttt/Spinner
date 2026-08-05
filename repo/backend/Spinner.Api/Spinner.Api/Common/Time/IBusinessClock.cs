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

    /// <summary>
    /// The instant a business date begins.
    /// </summary>
    /// <remarks>
    /// The counterpart to <see cref="ToBusinessDate"/>, and what lets a date filter be
    /// applied in the database instead of in memory. Converting the boundaries once is
    /// the only way to compare a stored instant against a local calendar day in SQL,
    /// since the database has no idea which time zone the shop trades in.
    /// </remarks>
    DateTimeOffset StartOfBusinessDay(DateOnly businessDate);

    /// <summary>
    /// The instant the day after <paramref name="businessDate"/> begins.
    /// </summary>
    /// <remarks>
    /// Exclusive upper bound, so a comparison never has to guess at the last
    /// representable moment of a day.
    /// </remarks>
    DateTimeOffset EndOfBusinessDay(DateOnly businessDate);
}
