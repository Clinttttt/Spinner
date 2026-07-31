using Spinner.Api.Common.Configuration;

namespace Spinner.Test.Common.Configuration;

public sealed class DatabaseMigrationRunnerTests
{
    [Theory]
    [InlineData("--migrate")]
    [InlineData("--MIGRATE")]
    public void IsRequested_Should_Detect_The_Switch_Regardless_Of_Case(string argument)
    {
        Assert.True(DatabaseMigrationRunner.IsRequested([argument]));
    }

    [Fact]
    public void IsRequested_Should_Be_False_For_A_Normal_Api_Start()
    {
        Assert.False(DatabaseMigrationRunner.IsRequested([]));
        Assert.False(DatabaseMigrationRunner.IsRequested(["--urls", "http://+:8080"]));
    }

    [Theory]
    [InlineData("true")]
    [InlineData("TRUE")]
    [InlineData(" true ")]
    [InlineData("1")]
    public void Environment_Variable_Should_Enable_Migrations(string value)
    {
        Assert.True(DatabaseMigrationRunner.IsEnvironmentVariableEnabled(value));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("false")]
    [InlineData("0")]
    [InlineData("yes")]
    public void Environment_Variable_Should_Not_Enable_Migrations(string? value)
    {
        Assert.False(DatabaseMigrationRunner.IsEnvironmentVariableEnabled(value));
    }

    [Fact]
    public async Task RunAsync_Should_Explain_A_Missing_Connection_String()
    {
        // A migration needs only the database connection: no JWT key, webhook
        // secret, or email credentials. The failure must say exactly that.
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => DatabaseMigrationRunner.RunAsync([DatabaseMigrationRunner.CommandLineSwitch]));

        Assert.Contains("ConnectionStrings:DefaultConnection", exception.Message);
    }
}
