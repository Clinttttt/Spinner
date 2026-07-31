namespace Spinner.Api.Common.Time;

public sealed class BusinessTimeOptions
{
    public const string SectionName = "Business";

    /// <summary>
    /// Used when the host has no time zone database entry for the configured id.
    /// Philippine Standard Time has no daylight saving, so a fixed +08:00 offset
    /// is a safe fallback.
    /// </summary>
    public static readonly TimeZoneInfo FallbackTimeZone = TimeZoneInfo.CreateCustomTimeZone(
        "Spinner/BusinessTime",
        TimeSpan.FromHours(8),
        "Philippine Standard Time",
        "Philippine Standard Time");

    public string TimeZone { get; set; } = "Asia/Manila";
}
