using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Results;
using Spinner.Api.Controllers;
using ApiResult = Spinner.Api.Common.Results.Result;

namespace Spinner.Test.Api.ResponseHandling;

public sealed class ApiControllerBaseTests
{
    [Fact]
    public void HandleResponse_Should_Return_OkObject_When_Generic_Result_Succeeds()
    {
        var controller = new TestApiController();

        var response = controller.Execute(Result<int>.Success(42));

        var ok = Assert.IsType<OkObjectResult>(response.Result);
        Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
        Assert.Equal(42, ok.Value);
    }

    [Fact]
    public void HandleResponse_Should_Return_Ok_When_NonGeneric_Result_Succeeds()
    {
        var controller = new TestApiController();

        var response = controller.Execute(ApiResult.Success());

        Assert.IsType<OkResult>(response);
    }

    [Fact]
    public void HandleResponse_Should_Return_NoContent_When_Result_Is_NoContent()
    {
        var controller = new TestApiController();

        var response = controller.Execute(Result<bool>.NoContent());

        Assert.IsType<NoContentResult>(response.Result);
    }

    [Theory]
    [InlineData(ResultStatus.Validation, typeof(BadRequestObjectResult), StatusCodes.Status400BadRequest)]
    [InlineData(ResultStatus.Failure, typeof(BadRequestObjectResult), StatusCodes.Status400BadRequest)]
    [InlineData(ResultStatus.NotFound, typeof(NotFoundObjectResult), StatusCodes.Status404NotFound)]
    [InlineData(ResultStatus.Conflict, typeof(ConflictObjectResult), StatusCodes.Status409Conflict)]
    [InlineData(ResultStatus.Unauthorized, typeof(UnauthorizedObjectResult), StatusCodes.Status401Unauthorized)]
    [InlineData(ResultStatus.Forbidden, typeof(ObjectResult), StatusCodes.Status403Forbidden)]
    public void HandleResponse_Should_Map_Failed_Result_To_Expected_Http_Response(
        ResultStatus status,
        Type expectedResultType,
        int expectedStatusCode)
    {
        var controller = new TestApiController();
        var result = CreateFailedResult(status);

        var response = controller.Execute(result);

        Assert.True(expectedResultType.IsInstanceOfType(response.Result));
        var objectResult = Assert.IsAssignableFrom<ObjectResult>(response.Result);
        Assert.Equal(expectedStatusCode, objectResult.StatusCode);

        var problem = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal(expectedStatusCode, problem.Status);
        Assert.False(string.IsNullOrWhiteSpace(problem.Title));
        Assert.True(problem.Extensions.ContainsKey("traceId"));
    }

    private static Result<bool> CreateFailedResult(ResultStatus status) => status switch
    {
        ResultStatus.Validation => Result<bool>.Validation("Validation failed."),
        ResultStatus.Failure => Result<bool>.Failure("Request failed."),
        ResultStatus.NotFound => Result<bool>.NotFound("Order not found."),
        ResultStatus.Conflict => Result<bool>.Conflict("Order conflict."),
        ResultStatus.Unauthorized => Result<bool>.Unauthorized("Unauthorized."),
        ResultStatus.Forbidden => Result<bool>.Forbidden("Forbidden."),
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null)
    };

    private sealed class TestApiController : ApiControllerBase
    {
        public TestApiController()
            : base(null!)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
        }

        public ActionResult<T> Execute<T>(Result<T> result) => HandleResponse(result);

        public ActionResult Execute(ApiResult result) => HandleResponse(result);
    }
}
