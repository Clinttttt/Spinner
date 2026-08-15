using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Spinner.Api.Common.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // The caller went away. Nothing failed, and there is nobody left to answer, so
            // this must not be logged as a server error or counted as one.
            return;
        }
        catch (BadHttpRequestException exception)
        {
            // The request itself was at fault: a body that never finished arriving, or one
            // that could not be parsed. Kestrel already decided the right status code.
            //
            // This used to fall into the handler below and be answered with 500, which put a
            // customer's flaky mobile connection into the logs as a server failure and made
            // real faults harder to see. Observed live: "Reading the request body timed out
            // due to data arriving too slowly."
            _logger.LogWarning(
                exception,
                "Rejected a malformed or incomplete request: {Message}",
                exception.Message);

            if (context.Response.HasStarted)
                throw;

            await WriteProblem(
                context,
                exception.StatusCode,
                "Request could not be read",
                "The request was incomplete or malformed. Please try again.");
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Unhandled exception while processing request.");

            if (context.Response.HasStarted)
                throw;

            await WriteProblem(
                context,
                StatusCodes.Status500InternalServerError,
                "Unexpected server error",
                "An unexpected error occurred while processing the request.");
        }
    }

    private static async Task WriteProblem(
        HttpContext context,
        int statusCode,
        string title,
        string detail)
    {
        context.Response.StatusCode = statusCode;

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Type = $"https://httpstatuses.com/{statusCode}"
        };

        problem.Extensions["traceId"] =
            Activity.Current?.Id ?? context.TraceIdentifier;

        // The content type is passed here rather than set on the response: WriteAsJsonAsync
        // overwrites it with application/json otherwise, so the problem+json this has always
        // meant to send was never actually sent.
        await context.Response.WriteAsJsonAsync(
            problem,
            options: null,
            contentType: "application/problem+json");
    }
}
