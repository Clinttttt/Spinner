using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Spinner.Api.Common.Configuration;

namespace Spinner.Test.Common.Configuration;

public sealed class StartupConfigurationValidatorTests
{
    [Fact]
    public void Validate_Should_Allow_Development_Defaults()
    {
        var configuration = CreateConfiguration(
            jwtKey: "Spinner-Laundry-System-SuperSecretKey@2026!EngrSpin!LaundryOperations",
            webhookSecret: "dev-online-payment-webhook-secret");

        StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Development));
    }

    [Fact]
    public void Validate_Should_Reject_Short_Jwt_Key()
    {
        var configuration = CreateConfiguration(
            jwtKey: "short",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough");

        Assert.Throws<InvalidOperationException>(() =>
            StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production)));
    }

    [Fact]
    public void Validate_Should_Reject_Development_Secrets_In_Production()
    {
        var configuration = CreateConfiguration(
            jwtKey: "Spinner-Laundry-System-SuperSecretKey@2026!EngrSpin!LaundryOperations",
            webhookSecret: "dev-online-payment-webhook-secret");

        Assert.Throws<InvalidOperationException>(() =>
            StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production)));
    }

    private static IConfiguration CreateConfiguration(string jwtKey, string webhookSecret)
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = jwtKey,
                ["OnlinePayments:WebhookSecret"] = webhookSecret
            })
            .Build();
    }

    private sealed class TestEnvironment : IHostEnvironment
    {
        public TestEnvironment(string environmentName)
        {
            EnvironmentName = environmentName;
        }

        public string EnvironmentName { get; set; }
        public string ApplicationName { get; set; } = "Spinner.Test";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
