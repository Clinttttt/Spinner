using System.Globalization;
using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Spinner.Api.Common.Security;

/// <summary>
/// Request rate limits for the endpoints that can be reached without an account.
/// </summary>
/// <remarks>
/// Nothing was throttled before this. That left password guessing, invitation-code
/// guessing, order-code enumeration and unlimited anonymous booking all free of
/// charge, and a single script could also run up the shop's payment-gateway usage.
///
/// Limits are partitioned per client address rather than globally so one abusive
/// caller cannot lock out the shop's own customers. They are deliberately generous
/// enough for genuine use: the customer counter phone is shared, so several real
/// people can legitimately appear as one address.
/// </remarks>
public static class RateLimitPolicies
{
    /// <summary>Sign-in and other credential checks.</summary>
    public const string Authentication = "auth";

    /// <summary>Endpoints that send an email or SMS when called.</summary>
    public const string AccountCodes = "account-codes";

    /// <summary>Anonymous booking and payment checkout.</summary>
    public const string Booking = "booking";

    /// <summary>Anonymous lookups keyed on a code, which are guessable.</summary>
    public const string PublicLookup = "public-lookup";

    /// <summary>Anonymous image reads.</summary>
    /// <remarks>
    /// Generous, because these are ordinary page and email images: a settings screen showing
    /// the logo and a list of staff photos is a handful of requests at once, and several real
    /// people can share one address. It exists so the free storage allowance cannot be spent
    /// by somebody fetching the same logo in a loop, not to ration normal viewing. Long cache
    /// headers mean a returning viewer usually does not reach this endpoint at all.
    /// </remarks>
    public const string PublicMedia = "public-media";

    public static void AddSpinnerRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Tells a well-behaved client when to come back instead of leaving it to
            // retry blindly.
            options.OnRejected = async (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)retryAfter.TotalSeconds).ToString(NumberFormatInfo.InvariantInfo);
                }

                context.HttpContext.Response.ContentType = "application/json";
                await context.HttpContext.Response.WriteAsync(
                    "{\"message\":\"Too many requests. Please wait a moment and try again.\"}",
                    cancellationToken);
            };

            // Password and code guessing. Tight, because a person signing in legitimately
            // needs a handful of attempts, not hundreds.
            AddFixedWindow(options, Authentication, permitLimit: 10, windowMinutes: 1);

            // Each of these sends a message that costs money and annoys the recipient.
            AddFixedWindow(options, AccountCodes, permitLimit: 5, windowMinutes: 5);

            // Real bookings are occasional. This still allows a busy shared phone.
            AddFixedWindow(options, Booking, permitLimit: 20, windowMinutes: 10);

            // Order codes are short, so unlimited lookups mean they can be walked.
            AddFixedWindow(options, PublicLookup, permitLimit: 30, windowMinutes: 1);

            // Images. High enough that no real viewer meets it, low enough that the storage
            // allowance cannot be drained by a script.
            AddFixedWindow(options, PublicMedia, permitLimit: 300, windowMinutes: 1);
        });
    }

    private static void AddFixedWindow(
        RateLimiterOptions options,
        string policyName,
        int permitLimit,
        int windowMinutes) =>
        options.AddPolicy(policyName, httpContext => RateLimitPartition.GetFixedWindowLimiter(
            ClientKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(windowMinutes),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            }));

    /// <summary>
    /// Identifies the caller for partitioning.
    /// </summary>
    /// <remarks>
    /// The API runs behind Azure Container Apps, so the socket address is the ingress proxy
    /// and would put every caller in one bucket. The forwarded header carries the real
    /// address, but only the end of it can be trusted.
    ///
    /// X-Forwarded-For grows left to right: each proxy appends the address it received the
    /// request from. Anything already in the header arrived from the client, so the leftmost
    /// entry is whatever the caller chose to put there. This used to read that first entry,
    /// which meant a caller could send a different value on every request, land in a fresh
    /// bucket each time, and never be limited at all — on the login and public booking
    /// endpoints these policies exist to protect.
    ///
    /// The last entry is the address our own ingress observed, which a caller cannot forge.
    /// There is exactly one proxy in front of this API: the custom domain points straight at
    /// Container Apps with nothing else in between.
    ///
    /// Kept internal rather than private so the parsing can be tested directly.
    /// </remarks>
    internal static string ClientKey(HttpContext httpContext)
    {
        var forwarded = httpContext.Request.Headers["X-Forwarded-For"].ToString();

        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var entries = forwarded.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

            if (entries.Length > 0)
            {
                // Envoy appends a port to the address it saw, which has to come off or every
                // request from one client would look like a different caller.
                var candidate = WithoutPort(entries[^1]);

                if (!string.IsNullOrWhiteSpace(candidate))
                    return candidate;
            }
        }

        return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    /// <summary>
    /// Strips a trailing port from a forwarded address, leaving IPv6 addresses intact.
    /// </summary>
    private static string WithoutPort(string address)
    {
        if (IPAddress.TryParse(address, out var parsed))
            return parsed.ToString();

        // "203.0.113.4:51514", or "[::1]:51514".
        if (IPEndPoint.TryParse(address, out var endpoint))
            return endpoint.Address.ToString();

        return address;
    }
}
