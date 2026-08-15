using System.Net;
using Microsoft.AspNetCore.Http;
using Spinner.Api.Common.Security;

namespace Spinner.Test.Common.Security;

/// <summary>
/// Rate limiting is what stands in front of the login endpoint and the public booking
/// endpoints. It partitions on the caller's address, so how that address is decided is the
/// whole of its strength.
///
/// It used to read X-Forwarded-For, taking the last entry on the reasoning that each proxy
/// appends the address it received from, so the final entry is what our own ingress saw and
/// cannot be forged. That was tested against the deployed system and proved false: fourteen
/// sign-in attempts each carrying a different X-Forwarded-For were not limited at all, while
/// the same fourteen without the header were refused after ten. The header is caller-controlled
/// from end to end here, so every forged value bought a fresh bucket and unlimited guessing.
///
/// These tests exist to stop that returning: whatever a caller puts in the header, the bucket
/// must not move.
/// </summary>
public sealed class RateLimitClientKeyTests
{
    [Fact]
    public void Should_Ignore_The_Forwarded_Header_Entirely()
    {
        var context = Request("198.51.100.7, 203.0.113.4");
        context.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.10");

        Assert.Equal("192.0.2.10", RateLimitPolicies.ClientKey(context));
    }

    [Fact]
    public void Should_Give_A_Spoofing_Caller_The_Same_Bucket_However_The_Header_Changes()
    {
        // The regression guard for the real defect. Every one of these was a separate bucket
        // before, which is why the limit counted to one and never tripped.
        var headers = new[]
        {
            "10.0.0.1, 203.0.113.4",
            "172.16.9.9, 198.51.100.1",
            "203.0.113.9",
            "junk",
            "2001:db8::1",
            "203.0.113.4:51514",
        };

        var keys = headers
            .Select(header =>
            {
                var context = Request(header);
                context.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.10");
                return RateLimitPolicies.ClientKey(context);
            })
            .Distinct()
            .ToArray();

        Assert.Single(keys);
        Assert.Equal("192.0.2.10", keys[0]);
    }

    [Fact]
    public void Should_Use_The_Socket_Address()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.10");

        Assert.Equal("192.0.2.10", RateLimitPolicies.ClientKey(context));
    }

    [Fact]
    public void Should_Keep_An_IPv6_Socket_Address_Intact()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("2001:db8::1");

        Assert.Equal("2001:db8::1", RateLimitPolicies.ClientKey(context));
    }

    [Fact]
    public void Should_Not_Throw_When_Nothing_Identifies_The_Caller()
    {
        // A limiter that throws would take the endpoint down rather than protect it.
        Assert.Equal("unknown", RateLimitPolicies.ClientKey(new DefaultHttpContext()));
    }

    private static DefaultHttpContext Request(string forwardedFor)
    {
        var context = new DefaultHttpContext();
        context.Request.Headers["X-Forwarded-For"] = forwardedFor;
        return context;
    }
}
