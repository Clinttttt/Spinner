using System.Security.Cryptography;

namespace Spinner.Api.Features.Bookings;

public static class BookingCodeGenerator
{
    public static string NewOrderCode(DateTimeOffset now) =>
        $"ES-{now:yyyyMMddHHmmssfff}-{RandomNumberGenerator.GetInt32(100, 999)}";

    public static string NewTrackingCode() =>
        $"TRK-{Guid.NewGuid():N}";
}
