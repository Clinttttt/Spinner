using Microsoft.AspNetCore.Http;
using Spinner.Api.Common.Middleware;

namespace Spinner.Test.Common.Middleware;

public sealed class SecurityHeadersMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_Should_Add_Security_Headers()
    {
        var context = new DefaultHttpContext();
        var middleware = new SecurityHeadersMiddleware(next =>
        {
            next.Response.StatusCode = StatusCodes.Status204NoContent;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context);
        await context.Response.StartAsync();

        Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"]);
        Assert.Equal("DENY", context.Response.Headers["X-Frame-Options"]);
        Assert.Equal("no-referrer", context.Response.Headers["Referrer-Policy"]);
        Assert.Equal("none", context.Response.Headers["X-Permitted-Cross-Domain-Policies"]);
    }
}
