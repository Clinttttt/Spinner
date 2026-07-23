namespace Spinner.Api.Common.Results;

public sealed class Result : ResultBase
{
    public static Result Success() => new()
    {
        IsSuccess = true,
        Status = ResultStatus.Success
    };

    public static Result NoContent() => new()
    {
        IsSuccess = true,
        Status = ResultStatus.NoContent
    };

    public static Result Validation(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Validation,
        Error = Error.Validation(message)
    };

    public static Result Validation(IReadOnlyList<Error> errors) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Validation,
        Error = errors.FirstOrDefault() ?? Error.Validation("Validation failed."),
        Errors = errors
    };

    public static Result Failure(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Failure,
        Error = Error.Failure(message)
    };

    public static Result NotFound(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.NotFound,
        Error = Error.NotFound(message)
    };

    public static Result Conflict(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Conflict,
        Error = Error.Conflict(message)
    };

    public static Result Unauthorized(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Unauthorized,
        Error = Error.Unauthorized(message)
    };

    public static Result Forbidden(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Forbidden,
        Error = Error.Forbidden(message)
    };
}
