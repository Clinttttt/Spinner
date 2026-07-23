using MediatR;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected readonly ISender Sender;

    protected ApiControllerBase(ISender sender)
    {
        Sender = sender;
    }

    protected ActionResult<T> HandleResponse<T>(Result<T> result)
    {
        if (result.IsSuccess)
        {
            if (result.Status == ResultStatus.NoContent)
                return NoContent();

            return Ok(result.Value);
        }

        return result.Status switch
        {
            ResultStatus.Validation => BadRequest(CreateProblemDetails(result, StatusCodes.Status400BadRequest)),
            ResultStatus.NotFound => NotFound(CreateProblemDetails(result, StatusCodes.Status404NotFound)),
            ResultStatus.Conflict => Conflict(CreateProblemDetails(result, StatusCodes.Status409Conflict)),
            ResultStatus.Unauthorized => Unauthorized(CreateProblemDetails(result, StatusCodes.Status401Unauthorized)),
            ResultStatus.Forbidden => StatusCode(
                StatusCodes.Status403Forbidden,
                CreateProblemDetails(result, StatusCodes.Status403Forbidden)),
            _ => BadRequest(CreateProblemDetails(result, StatusCodes.Status400BadRequest))
        };
    }

    protected ActionResult HandleResponse(Result result)
    {
        if (result.IsSuccess)
        {
            if (result.Status == ResultStatus.NoContent)
                return NoContent();

            return Ok();
        }

        return result.Status switch
        {
            ResultStatus.Validation => BadRequest(CreateProblemDetails(result, StatusCodes.Status400BadRequest)),
            ResultStatus.NotFound => NotFound(CreateProblemDetails(result, StatusCodes.Status404NotFound)),
            ResultStatus.Conflict => Conflict(CreateProblemDetails(result, StatusCodes.Status409Conflict)),
            ResultStatus.Unauthorized => Unauthorized(CreateProblemDetails(result, StatusCodes.Status401Unauthorized)),
            ResultStatus.Forbidden => StatusCode(
                StatusCodes.Status403Forbidden,
                CreateProblemDetails(result, StatusCodes.Status403Forbidden)),
            _ => BadRequest(CreateProblemDetails(result, StatusCodes.Status400BadRequest))
        };
    }

    protected ActionResult<T> HandleCreatedResponse<T>(
        Result<T> result,
        string routeName,
        object routeValues)
    {
        if (!result.IsSuccess)
            return HandleResponse(result);

        return CreatedAtRoute(routeName, routeValues, result.Value);
    }

    private ProblemDetails CreateProblemDetails(ResultBase result, int statusCode)
    {
        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = result.Error.Title,
            Detail = result.Error.Message,
            Type = result.Error.Type
        };

        problem.Extensions["traceId"] = HttpContext.TraceIdentifier;

        if (result.Errors.Count > 0)
            problem.Extensions["errors"] = result.Errors;

        return problem;
    }
}
