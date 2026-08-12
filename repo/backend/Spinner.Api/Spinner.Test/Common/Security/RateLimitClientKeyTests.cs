using System.Net;
using Microsoft.AspNetCore.Http;
using Spinner.Api.Common.Security;

namespace Spinner.Test.Common.Security;

/// <summary>
/// Rate limiting is what stands in front of the login endpoint and the public booking
/// endpoints. It partitions on the caller's address, so how that address is decided is the
/// whole of its strength.
///
/// X-Forwarded-For grows left to right, each proxy appending the address it received the
/// request from. Everything already in the header when it arrives was put there by the
/// caller. Reading the leftmost entry therefore let a caller choose its own bucket, send a
/// different value each time, and never be limited.
/// </summary>
public sealed class RateLimitClientKeyTests
{
    [Fact]
    public void Should_Ignore_An_Address_The_Caller_Put_In_The_Header()
    {
        // Our ingress appended the address it actually saw, on the right. The value on the
        // left is the caller's invention.
        var context = Request("198.51.100.7, 203.0.113.4");

        Assert.Equal("203.0.113.4", RateLimitPolicies.ClientKey(context));
    }

    [Fact]
    public void Should_Give_A_Spoofing_Caller_The_Same_Bucket_Every_Time()
    {
        // The point of the fix: rotating the forged part must not move the caller between
        // buckets, or the limit counts to one and never trips.
        var first = RateLimitPolicies.ClientKey(Request("10.0.0.1, 203.0.113.4"));
        var second = RateLimitPolicies.ClientKey(Request("172.16.9.9, 203.0.113.4"));
        var third = RateLimitPolicies.ClientKey(Request("junk, 203.0.113.4"));

        Assert.Equal(first, second);
        Assert.Equal(first, third);
    }

    [Fact]
    public void Should_Use_The_Single_Entry_When_There_Is_Only_One()
    {
        Assert.Equal("203.0.113.4", RateLimitPolicies.ClientKey(Request("203.0.113.4")));
    }

    [Fact]
    public void Should_Drop_The_Port_So_One_Caller_Is_One_Bucket()
    {
        // Envoy appends the port it saw. Left on, every request from one client would look
        // like a new caller, which is the same failure by accident.
        var first = RateLimitPolicies.ClientKey(Request("203.0.113.4:51514"));
        var second = RateLimitPolicies.ClientKey(Request("203.0.113.4:51988"));

        Assert.Equal("203.0.113.4", first);
        Assert.Equal(first, second);
    }

    [Fact]
    public void Should_Keep_An_IPv6_Address_Intact()
    {
        Assert.Equal("2001:db8::1", RateLimitPolicies.ClientKey(Request("2001:db8::1")));
        Assert.Equal("2001:db8::1", RateLimitPolicies.ClientKey(Request("[2001:db8::1]:51514")));
    }

    [Fact]
    public void Should_Fall_Back_To_The_Socket_Address_Without_A_Header()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.10");

        Assert.Equal("192.0.2.10", RateLimitPolicies.ClientKey(context));
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
