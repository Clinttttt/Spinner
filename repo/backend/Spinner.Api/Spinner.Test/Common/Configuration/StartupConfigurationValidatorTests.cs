using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Spinner.Api.Common.Configuration;
using Spinner.Api.Integrations.Media;

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

    [Fact]
    public void Validate_Should_Allow_A_Deployment_With_No_Image_Storage()
    {
        // Image upload is optional. A deployment without it must still start.
        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough");

        StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production));
    }

    [Fact]
    public void Validate_Should_Reject_Partly_Configured_Image_Storage()
    {
        // The failure this prevents is an app that offers an upload button which fails on
        // every press, which is worse than not offering one at all.
        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough",
            mediaSettings: new Dictionary<string, string?>
            {
                ["MediaStorage:AccountId"] = "account-id",
                ["MediaStorage:AccessKeyId"] = "access-key-id",
                // Secret and bucket deliberately absent.
            });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production)));

        Assert.Contains("MediaStorage:SecretAccessKey", exception.Message);
        Assert.Contains("MediaStorage:BucketName", exception.Message);
    }

    [Fact]
    public void Validate_Should_Accept_Fully_Configured_Image_Storage()
    {
        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough",
            mediaSettings: CompleteMediaSettings());

        StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production));
    }

    [Fact]
    public void Validate_Should_Reject_A_NonHttps_Media_Base_Url_In_Production()
    {
        var settings = CompleteMediaSettings();
        settings["MediaStorage:PublicBaseUrl"] = "http://api.spinlaundry.online";

        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough",
            mediaSettings: settings);

        var exception = Assert.Throws<InvalidOperationException>(() =>
            StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production)));

        Assert.Contains("MediaStorage:PublicBaseUrl", exception.Message);
    }

    [Fact]
    public void Validate_Should_Reject_A_Missing_Media_Base_Url_In_Production()
    {
        var settings = CompleteMediaSettings();
        settings.Remove("MediaStorage:PublicBaseUrl");

        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough",
            mediaSettings: settings);

        Assert.Throws<InvalidOperationException>(() =>
            StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production)));
    }

    [Fact]
    public void Validate_Should_Not_Demand_A_Media_Base_Url_In_Development()
    {
        var settings = CompleteMediaSettings();
        settings.Remove("MediaStorage:PublicBaseUrl");

        var configuration = CreateConfiguration(
            jwtKey: "Spinner-Laundry-System-SuperSecretKey@2026!EngrSpin!LaundryOperations",
            webhookSecret: "dev-online-payment-webhook-secret",
            mediaSettings: settings);

        StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Development));
    }

    [Fact]
    public void Validate_Should_Reject_An_Upload_Limit_Above_What_The_Endpoint_Accepts()
    {
        // Above the request ceiling the server would reject the upload before the application
        // could explain why, leaving the owner with a dead connection instead of a message.
        var settings = CompleteMediaSettings();
        settings["MediaStorage:MaxUploadBytes"] =
            (MediaStorageOptions.RequestBodyByteCeiling + 1).ToString();

        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough",
            mediaSettings: settings);

        var exception = Assert.Throws<InvalidOperationException>(() =>
            StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production)));

        Assert.Contains("MaxUploadBytes", exception.Message);
    }

    [Fact]
    public void Validate_Should_Reject_A_Zero_Upload_Limit()
    {
        var settings = CompleteMediaSettings();
        settings["MediaStorage:MaxUploadBytes"] = "0";

        var configuration = CreateConfiguration(
            jwtKey: "a-production-jwt-signing-key-that-is-long-enough",
            webhookSecret: "a-production-webhook-secret-that-is-long-enough",
            mediaSettings: settings);

        Assert.Throws<InvalidOperationException>(() =>
            StartupConfigurationValidator.Validate(configuration, new TestEnvironment(Environments.Production)));
    }

    private static Dictionary<string, string?> CompleteMediaSettings() => new()
    {
        ["MediaStorage:AccountId"] = "account-id",
        ["MediaStorage:AccessKeyId"] = "access-key-id",
        ["MediaStorage:SecretAccessKey"] = "secret-access-key",
        ["MediaStorage:BucketName"] = "spinner-media",
        ["MediaStorage:PublicBaseUrl"] = "https://api.spinlaundry.online",
    };

    private static IConfiguration CreateConfiguration(
        string jwtKey,
        string webhookSecret,
        string? connectionString = "Host=database;Database=spinner;Username=spinner;Password=test",
        string publicPaymentBaseUrl = "https://customer.example.com/pay",
        string emailProvider = "Resend",
        string? resendApiKey = "re_test_api_key",
        IDictionary<string, string?>? mediaSettings = null)
    {
        var settings = new Dictionary<string, string?>
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
        };

        if (mediaSettings is not null)
        {
            foreach (var (key, value) in mediaSettings)
                settings[key] = value;
        }

        return new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
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
