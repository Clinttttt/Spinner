using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Spinner.Api.Integrations.OnlinePayments;

public sealed class OnlinePaymentSignatureVerifier
{
    private readonly OnlinePaymentOptions _options;

    public OnlinePaymentSignatureVerifier(Microsoft.Extensions.Options.IOptions<OnlinePaymentOptions> options)
    {
        _options = options.Value;
    }

    public bool Verify(string paymentReference, decimal amount, string status, string signature)
    {
        if (string.IsNullOrWhiteSpace(signature))
            return false;

        var expected = Sign(paymentReference, amount, status, _options.WebhookSecret);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature.Trim()));
    }

    public static string Sign(string paymentReference, decimal amount, string status, string secret)
    {
        var payload = string.Join(
            '|',
            paymentReference.Trim(),
            amount.ToString("0.00", CultureInfo.InvariantCulture),
            status.Trim().ToLowerInvariant());

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));

        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
