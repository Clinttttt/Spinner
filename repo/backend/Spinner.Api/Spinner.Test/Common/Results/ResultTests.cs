using Spinner.Api.Common.Results;

namespace Spinner.Test.Common.Results;

public sealed class ResultTests
{
    [Fact]
    public void Success_Should_Create_Success_Result_With_Value()
    {
        var result = Result<string>.Success("ok");

        Assert.True(result.IsSuccess);
        Assert.Equal(ResultStatus.Success, result.Status);
        Assert.Equal("ok", result.Value);
        Assert.Equal(Error.None, result.Error);
    }

    [Fact]
    public void NoContent_Should_Create_Success_Result_Without_Value()
    {
        var result = Result.NoContent();

        Assert.True(result.IsSuccess);
        Assert.Equal(ResultStatus.NoContent, result.Status);
    }

    [Theory]
    [InlineData(ResultStatus.Validation)]
    [InlineData(ResultStatus.Failure)]
    [InlineData(ResultStatus.NotFound)]
    [InlineData(ResultStatus.Conflict)]
    [InlineData(ResultStatus.Unauthorized)]
    [InlineData(ResultStatus.Forbidden)]
    public void Failure_Factories_Should_Create_Failed_Result_With_Error(ResultStatus status)
    {
        var result = status switch
        {
            ResultStatus.Validation => Result<bool>.Validation("Invalid request."),
            ResultStatus.Failure => Result<bool>.Failure("Request failed."),
            ResultStatus.NotFound => Result<bool>.NotFound("Order not found."),
            ResultStatus.Conflict => Result<bool>.Conflict("Payment already confirmed."),
            ResultStatus.Unauthorized => Result<bool>.Unauthorized("Login required."),
            ResultStatus.Forbidden => Result<bool>.Forbidden("Access denied."),
            _ => throw new ArgumentOutOfRangeException(nameof(status), status, null)
        };

        Assert.False(result.IsSuccess);
        Assert.Equal(status, result.Status);
        Assert.NotEqual(Error.None, result.Error);
        Assert.NotEmpty(result.Error.Message);
    }

    [Fact]
    public void Validation_With_Errors_Should_Preserve_Error_List()
    {
        var errors = new[]
        {
            Error.Validation("Mobile number is required."),
            Error.Validation("Pickup date is required.")
        };

        var result = Result.Validation(errors);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Validation, result.Status);
        Assert.Equal(2, result.Errors.Count);
        Assert.Equal(errors[0], result.Error);
    }
}
