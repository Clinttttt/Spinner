namespace Spinner.Api.Common.Results;

public abstract class ResultBase
{
    public bool IsSuccess { get; init; }
    public ResultStatus Status { get; init; }
    public Error Error { get; init; } = Error.None;
    public IReadOnlyList<Error> Errors { get; init; } = [];
}
