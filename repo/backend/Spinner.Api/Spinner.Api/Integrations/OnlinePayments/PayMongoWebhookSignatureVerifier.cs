using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace Spinner.Api.Integrations.OnlinePayments;

/// <summary>
/// Verifies the <c>Paymongo-Signature</c> header on an incoming webhook.
/// </summary>
/// <remarks>
/// The header looks like <c>t=1496734173,te=&lt;hex&gt;,li=&lt;hex&gt;</c>: a
/// timestamp plus one signature for test traffic and one for live. The signature is
/// HMAC-SHA256 over <c>{timestamp}.{raw body}</c> keyed with the signing secret
/// shown when the webhook was created.
///
/// The raw body matters. Deserialising and re-serialising changes whitespace and
/// key order, which changes the hash, so the endpoint reads the body as text before
/// anything else touches it.
///
/// This is the only thing standing between an HTTP request and an order being
/// treated as paid, so an unparseable header, a wrong signature, or a timestamp
/// outside the tolerance is a rejection rather than a warning.
/// </remarks>
public sealed class PayMongoWebhookSignatureVerifier
{
    /// <summary>
    /// How far out of date a signature may be. Wide enough to absorb provider
    /// retries and clock drift, tight enough that a captured request cannot be
    /// replayed indefinitely.
    /// </summary>
    private static readonly TimeSpan Tolerance = TimeSpan.FromMinutes(10);

    private readonly OnlinePaymentOptions _options;

    public PayMongoWebhookSignatureVerifier(IOptions<OnlinePaymentOptions> options)
    {
        _options = options.Value;
    }

    public bool Verify(string rawBody, string? signatureHeader, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(_options.PayMongoWebhookSecret)) return false;
        if (string.IsNullOrWhiteSpace(signatureHeader)) return false;
        if (rawBody is null) return false;

        if (!TryParse(signatureHeader, out var timestamp, out var testSignature, out var liveSignature))
            return false;

        var age = now - DateTimeOffset.FromUnixTimeSeconds(timestamp);
        if (age > Tolerance || age < -Tolerance) return false;

        var provided = _options.IsTestMode ? testSignature : liveSignature;
        if (string.IsNullOrWhiteSpace(provided)) return false;

        var expected = Sign($"{timestamp}.{rawBody}", _options.PayMongoWebhookSecret);

        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expected),
            Encoding.ASCII.GetBytes(provided));
    }

    /// <summary>
    /// Describes a header without revealing it, so a rejected delivery can be
    /// diagnosed from logs. Useful if the provider ever changes the scheme: the
    /// failure is safe, because an unverifiable request is refused, but it still
    /// has to be findable.
    /// </summary>
    public string Describe(string? signatureHeader, string rawBody)
    {
        if (string.IsNullOrWhiteSpace(signatureHeader))
            return $"header=absent bodyLength={rawBody?.Length ?? 0}";

        var keys = signatureHeader
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2)[0])
            .ToArray();

        return $"headerKeys={string.Join('|', keys)} bodyLength={rawBody?.Length ?? 0} " +
               $"mode={(_options.IsTestMode ? "test" : "live")} secretConfigured=" +
               $"{!string.IsNullOrWhiteSpace(_options.PayMongoWebhookSecret)}";
    }

    private static bool TryParse(
        string header,
        out long timestamp,
        out string? testSignature,
        out string? liveSignature)
    {
        timestamp = 0;
        testSignature = null;
        liveSignature = null;

        foreach (var part in header.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
        {
            var separator = part.IndexOf('=');
            if (separator <= 0) continue;

            var key = part[..separator].Trim();
            var value = part[(separator + 1)..].Trim();

            switch (key)
            {
                case "t":
                    if (!long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out timestamp))
                        return false;
                    break;
                case "te":
                    testSignature = value;
                    break;
                case "li":
                    liveSignature = value;
                    break;
            }
        }

        return timestamp > 0;
    }

    private static string Sign(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexStringLower(hash);
    }

    /// <summary>Builds a header the same way PayMongo does. Used by tests.</summary>
    internal static string BuildHeader(string rawBody, string secret, long timestamp, bool testMode)
    {
        var signature = Sign($"{timestamp}.{rawBody}", secret);
        return testMode ? $"t={timestamp},te={signature}" : $"t={timestamp},li={signature}";
    }
}
