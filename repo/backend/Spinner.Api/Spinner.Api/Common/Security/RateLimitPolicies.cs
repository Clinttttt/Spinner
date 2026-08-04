using System.Globalization;
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
    /// The API runs behind Azure Container Apps, so the socket address is the
    /// ingress proxy and would put every caller in one bucket. The forwarded header
    /// is used when present, taking the first entry, which is the original client.
    /// </remarks>
    private static string ClientKey(HttpContext httpContext)
    {
        var forwarded = httpContext.Request.Headers["X-Forwarded-For"].ToString();

        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var first = forwarded.Split(',', StringSplitOptions.TrimEntries)[0];
            if (!string.IsNullOrWhiteSpace(first))
                return first;
        }

        return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
