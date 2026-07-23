namespace Spinner.Api.Common.Results;

public sealed class Result<T> : ResultBase
{
    public T? Value { get; init; }

    public static Result<T> Success(T value) => new()
    {
        IsSuccess = true,
        Status = ResultStatus.Success,
        Value = value
    };

    public static Result<T> Created(T value) => new()
    {
        IsSuccess = true,
        Status = ResultStatus.Created,
        Value = value
    };

    public static Result<T> NoContent() => new()
    {
        IsSuccess = true,
        Status = ResultStatus.NoContent
    };

    public static Result<T> Validation(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Validation,
        Error = Error.Validation(message)
    };

    public static Result<T> Validation(IReadOnlyList<Error> errors) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Validation,
        Error = errors.FirstOrDefault() ?? Error.Validation("Validation failed."),
        Errors = errors
    };

    public static Result<T> Failure(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Failure,
        Error = Error.Failure(message)
    };

    public static Result<T> NotFound(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.NotFound,
        Error = Error.NotFound(message)
    };

    public static Result<T> Conflict(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Conflict,
        Error = Error.Conflict(message)
    };

    public static Result<T> Unauthorized(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Unauthorized,
        Error = Error.Unauthorized(message)
    };

    public static Result<T> Forbidden(string message) => new()
    {
        IsSuccess = false,
        Status = ResultStatus.Forbidden,
        Error = Error.Forbidden(message)
    };
}
