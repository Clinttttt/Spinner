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

            // Every limit below is now shared by all callers behind the ingress, because the
            // partition key is the socket address rather than a header the caller can choose.
            // They are raised accordingly: the purpose is to make brute force and cost abuse
            // impractical, not to ration a busy Saturday at one laundromat.

            // Password and code guessing. An individual account is additionally protected by
            // its own lockout, so this only has to stop bulk attempts.
            AddFixedWindow(options, Authentication, permitLimit: 30, windowMinutes: 1);

            // Each of these sends a message that costs money and annoys the recipient.
            AddFixedWindow(options, AccountCodes, permitLimit: 15, windowMinutes: 5);

            // Real bookings are occasional, but a shared bucket has to cover every customer
            // booking at once.
            AddFixedWindow(options, Booking, permitLimit: 60, windowMinutes: 10);

            // Order codes are short, so unlimited lookups mean they can be walked.
            AddFixedWindow(options, PublicLookup, permitLimit: 90, windowMinutes: 1);

            // Images. High enough that no real viewer meets it, low enough that the storage
            // allowance cannot be drained by a script.
            AddFixedWindow(options, PublicMedia, permitLimit: 600, windowMinutes: 1);
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
    /// Uses the socket address, and deliberately ignores X-Forwarded-For.
    ///
    /// This used to read the last entry of that header, on the reasoning that each proxy
    /// appends the address it received the request from, so the final entry is what our own
    /// ingress observed and therefore cannot be forged. That reasoning was tested against the
    /// deployed system and is false here: fourteen sign-in attempts, each sending a different
    /// X-Forwarded-For, produced no rate limiting at all, while the same fourteen without the
    /// header were throttled after ten. The header is caller-controlled end to end, so every
    /// forged value bought a fresh bucket and unlimited password guessing.
    ///
    /// The consequence of using the socket address is that behind the container platform's
    /// ingress all callers share one bucket, so these limits are effectively global. That is a
    /// real trade: one abusive caller can consume the shop's allowance. It is accepted because
    /// an unlimited number of guesses is worse than a temporary refusal, the limits below are
    /// raised to account for the shared bucket, and a targeted attack on one account is
    /// separately stopped by that account's own lockout.
    /// </remarks>
    internal static string ClientKey(HttpContext httpContext) =>
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
