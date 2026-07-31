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

    [Fact]
    public void Validate_Should_Allow_Complete_Production_Configuration()
    {
        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough");

        StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production));
    }

    [Fact]
    public void Validate_Should_Reject_Missing_Connection_String()
    {
        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough",
            connectionString: null);

        Assert.Throws<InvalidOperationException>(() =>
            StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production)));
    }

    [Fact]
    public void Validate_Should_Reject_NonHttps_Public_Payment_Url_In_Production()
    {
        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough",
            publicPaymentBaseUrl: "http://customer.example.com/pay");

        Assert.Throws<InvalidOperationException>(() =>
            StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production)));
    }

    [Fact]
    public void Validate_Should_Reject_Missing_Resend_Api_Key_In_Production()
    {
        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough",
            resendApiKey: null);

        var exception = Assert.Throws<InvalidOperationException>(() =>
            StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production)));

        Assert.Equal("Resend:ApiKey must be configured.", exception.Message);
    }

    [Fact]
    public void Validate_Should_Reject_Logging_Email_Provider_In_Production()
    {
        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough",
            emailProvider: "Logging");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production)));

        Assert.Equal(
            "Production NotificationDelivery:EmailProvider must be Resend.",
            exception.Message);
    }

    private static IConfiguration CreateConfiguration(
        string jwtKey,
        string webhookSecret,
        string? connectionString = "Host=database;Database=spinner;Username=spinner;Password=test",
        string publicPaymentBaseUrl = "https://customer.example.com/pay",
        string emailProvider = "Resend",
        string? resendApiKey = "re_test_api_key")
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = connectionString,
                ["Jwt:Key"] = jwtKey,
                ["Jwt:Issuer"] = "Spinner.Api",
                ["Jwt:Audience"] = "Spinner.Client",
                ["OnlinePayments:WebhookSecret"] = webhookSecret,
                ["OnlinePayments:PublicPaymentBaseUrl"] = publicPaymentBaseUrl,
                ["NotificationDelivery:EmailProvider"] = emailProvider,
                ["NotificationDelivery:SmsProvider"] = "Logging",
                ["Resend:BaseUrl"] = "https://api.resend.com/",
                ["Resend:ApiKey"] = resendApiKey,
                ["Resend:FromEmail"] = "notifications@example.com",
                ["Resend:FromName"] = "Engr. Spin Laundromat"
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
