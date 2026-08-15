using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Spinner.Api.Common.Middleware;

namespace Spinner.Test.Common.Middleware;

/// <summary>
/// What the API tells a caller when something goes wrong, and what it records for us.
/// </summary>
/// <remarks>
/// The distinction matters operationally. A request that arrived incomplete is the caller's
/// or the network's problem; answering it with 500 puts every customer on a weak mobile signal
/// into the logs as a server failure, which buries the faults that are genuinely ours. This was
/// observed live: "Reading the request body timed out due to data arriving too slowly" came back
/// as a 500.
/// </remarks>
public sealed class ExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task Should_Report_An_Incomplete_Request_As_The_Callers_Fault()
    {
        var context = NewContext();

        await Middleware(_ => throw new BadHttpRequestException(
            "Reading the request body timed out.",
            StatusCodes.Status408RequestTimeout)).InvokeAsync(context);

        Assert.Equal(StatusCodes.Status408RequestTimeout, context.Response.StatusCode);
        Assert.Equal("application/problem+json", context.Response.ContentType);
    }

    [Fact]
    public async Task Should_Report_A_Malformed_Body_With_Its_Own_Status()
    {
        var context = NewContext();

        await Middleware(_ => throw new BadHttpRequestException(
            "Unexpected end of request content.",
            StatusCodes.Status400BadRequest)).InvokeAsync(context);

        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);
    }

    [Fact]
    public async Task Should_Still_Report_A_Genuine_Fault_As_A_Server_Error()
    {
        var context = NewContext();

        await Middleware(_ => throw new InvalidOperationException("something we broke"))
            .InvokeAsync(context);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
    }

    [Fact]
    public async Task Should_Say_Nothing_When_The_Caller_Has_Already_Gone()
    {
        // Answering an aborted request is impossible, and recording it as a failure is noise.
        var context = NewContext();
        var aborted = new CancellationTokenSource();
        await aborted.CancelAsync();
        context.RequestAborted = aborted.Token;

        await Middleware(_ => throw new OperationCanceledException()).InvokeAsync(context);

        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
    }

    private static ExceptionHandlingMiddleware Middleware(RequestDelegate next) =>
        new(next, NullLogger<ExceptionHandlingMiddleware>.Instance);

    private static DefaultHttpContext NewContext()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        return context;
    }
}
