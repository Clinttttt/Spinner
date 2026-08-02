using System.Security.Cryptography;

namespace Spinner.Api.Features.Bookings.StartBookingCheckout;

/// <summary>
/// The reference a customer sees while paying, and the key their return page uses.
/// </summary>
/// <remarks>
/// It appears in a URL the customer could edit, so the random tail is there to make
/// it unguessable: knowing one reference must not let anyone read someone else's
/// booking from the status endpoint.
/// </remarks>
public static class BookingCheckoutReference
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    public static string New(DateTimeOffset now)
    {
        var suffix = string.Concat(
            RandomNumberGenerator.GetItems<char>(Alphabet, 10));

        return $"PAY-{now:yyyyMMdd}-{suffix}";
    }
}
