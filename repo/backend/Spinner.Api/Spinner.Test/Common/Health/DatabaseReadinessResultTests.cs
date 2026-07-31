using Spinner.Api.Common.Health;

namespace Spinner.Test.Common.Health;

public sealed class DatabaseReadinessResultTests
{
    [Fact]
    public void IsReady_Should_Be_True_When_Database_Is_Connected_And_Current()
    {
        var result = DatabaseReadinessResult.Connected(0);

        Assert.True(result.IsReady);
    }

    [Fact]
    public void IsReady_Should_Be_False_When_Migrations_Are_Pending()
    {
        var result = DatabaseReadinessResult.Connected(1);

        Assert.False(result.IsReady);
    }

    [Fact]
    public void IsReady_Should_Be_False_When_Database_Is_Unreachable()
    {
        var result = DatabaseReadinessResult.Unreachable();

        Assert.False(result.IsReady);
    }
}
