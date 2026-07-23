using Spinner.Api.Common.Security;

namespace Spinner.Test.Common.Security;

public sealed class PasswordHasherTests
{
    [Fact]
    public void Verify_Should_Return_True_For_Correct_Password()
    {
        var hasher = new PasswordHasher();
        var hash = hasher.Hash("Owner@12345");

        Assert.True(hasher.Verify("Owner@12345", hash));
    }

    [Fact]
    public void Verify_Should_Return_False_For_Wrong_Password()
    {
        var hasher = new PasswordHasher();
        var hash = hasher.Hash("Owner@12345");

        Assert.False(hasher.Verify("wrong", hash));
    }
}
