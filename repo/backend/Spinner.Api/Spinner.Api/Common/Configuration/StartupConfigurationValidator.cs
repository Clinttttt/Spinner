using Spinner.Api.Integrations.OnlinePayments;

namespace Spinner.Api.Common.Configuration;

public static class StartupConfigurationValidator
{
    private const string DevelopmentWebhookSecret = "dev-online-payment-webhook-secret";

    public static void Validate(IConfiguration configuration, IHostEnvironment environment)
    {
        var jwtKey = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
            throw new InvalidOperationException("Jwt:Key must be configured and at least 32 characters long.");

        if (environment.IsDevelopment())
            return;

        if (jwtKey.Contains("SuperSecretKey", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Production Jwt:Key must not use the development secret.");

        var webhookSecret = configuration[$"{OnlinePaymentOptions.SectionName}:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(webhookSecret) || webhookSecret.Length < 32)
            throw new InvalidOperationException("OnlinePayments:WebhookSecret must be configured and at least 32 characters long.");

        if (string.Equals(webhookSecret, DevelopmentWebhookSecret, StringComparison.Ordinal))
            throw new InvalidOperationException("Production OnlinePayments:WebhookSecret must not use the development secret.");
    }
}
