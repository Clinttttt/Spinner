using System.Net.Mail;
using Spinner.Api.Features.Notifications.ProcessNotificationOutbox;
using Spinner.Api.Integrations.Notifications;
using Spinner.Api.Integrations.OnlinePayments;

namespace Spinner.Api.Common.Configuration;

public static class StartupConfigurationValidator
{
    private const string DevelopmentWebhookSecret = "dev-online-payment-webhook-secret";

    public static void Validate(IConfiguration configuration, IHostEnvironment environment)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured.");

        var jwtKey = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
            throw new InvalidOperationException("Jwt:Key must be configured and at least 32 characters long.");

        if (string.IsNullOrWhiteSpace(configuration["Jwt:Issuer"]))
            throw new InvalidOperationException("Jwt:Issuer must be configured.");

        if (string.IsNullOrWhiteSpace(configuration["Jwt:Audience"]))
            throw new InvalidOperationException("Jwt:Audience must be configured.");

        ValidateNotificationDelivery(configuration, environment);

        if (environment.IsDevelopment())
            return;

        if (jwtKey.Contains("SuperSecretKey", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Production Jwt:Key must not use the development secret.");

        var webhookSecret = configuration[$"{OnlinePaymentOptions.SectionName}:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(webhookSecret) || webhookSecret.Length < 32)
            throw new InvalidOperationException("OnlinePayments:WebhookSecret must be configured and at least 32 characters long.");

        if (string.Equals(webhookSecret, DevelopmentWebhookSecret, StringComparison.Ordinal))
            throw new InvalidOperationException("Production OnlinePayments:WebhookSecret must not use the development secret.");

        var publicPaymentBaseUrl =
            configuration[$"{OnlinePaymentOptions.SectionName}:PublicPaymentBaseUrl"];
        if (!Uri.TryCreate(publicPaymentBaseUrl, UriKind.Absolute, out var paymentUri) ||
            !string.Equals(paymentUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Production OnlinePayments:PublicPaymentBaseUrl must be an absolute HTTPS URL.");
        }

        ValidatePayMongo(configuration);
    }

    /// <summary>
    /// Checks the PayMongo settings only when they are present.
    /// </summary>
    /// <remarks>
    /// Online payment is optional: a shop can run on Cash on Delivery alone, and an
    /// unconfigured deployment refuses checkouts with a clear message rather than
    /// failing to boot. But a half-configured one is worse than either, so if a key
    /// is supplied the rest has to be right — including that the return URL is real,
    /// since that is where a paying customer is sent.
    /// </remarks>
    private static void ValidatePayMongo(IConfiguration configuration)
    {
        var section = OnlinePaymentOptions.SectionName;
        var secretKey = configuration[$"{section}:PayMongoSecretKey"];
        var webhookSecret = configuration[$"{section}:PayMongoWebhookSecret"];

        if (string.IsNullOrWhiteSpace(secretKey) && string.IsNullOrWhiteSpace(webhookSecret))
            return;

        if (string.IsNullOrWhiteSpace(secretKey))
            throw new InvalidOperationException(
                "OnlinePayments:PayMongoSecretKey must be set when a PayMongo webhook secret is configured.");

        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            throw new InvalidOperationException(
                "OnlinePayments:PayMongoWebhookSecret must be set when a PayMongo secret key is configured. " +
                "Without it no payment can ever be verified.");
        }

        if (!secretKey.StartsWith("sk_test_", StringComparison.Ordinal) &&
            !secretKey.StartsWith("sk_live_", StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "OnlinePayments:PayMongoSecretKey must be a PayMongo secret key (sk_test_ or sk_live_). " +
                "A public key cannot create a checkout.");
        }

        foreach (var name in new[] { "CheckoutSuccessUrl", "CheckoutCancelUrl" })
        {
            var value = configuration[$"{section}:{name}"];
            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
                !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"OnlinePayments:{name} must be an absolute HTTPS URL when PayMongo is configured.");
            }
        }
    }

    private static void ValidateNotificationDelivery(
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var outboxEnabled =
            configuration.GetValue<bool?>($"{NotificationOutboxOptions.SectionName}:Enabled") ?? true;
        if (!outboxEnabled)
            return;

        var emailProvider =
            configuration[
                $"{NotificationDeliveryOptions.SectionName}:EmailProvider"] ??
            (environment.IsDevelopment()
                ? NotificationDeliveryOptions.LoggingProvider
                : NotificationDeliveryOptions.ResendProvider);
        var smsProvider =
            configuration[
                $"{NotificationDeliveryOptions.SectionName}:SmsProvider"] ??
            NotificationDeliveryOptions.LoggingProvider;

        if (!string.Equals(
                emailProvider,
                NotificationDeliveryOptions.LoggingProvider,
                StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(
                emailProvider,
                NotificationDeliveryOptions.ResendProvider,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "NotificationDelivery:EmailProvider must be Logging or Resend.");
        }

        if (!string.Equals(
                smsProvider,
                NotificationDeliveryOptions.LoggingProvider,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "NotificationDelivery:SmsProvider must be Logging until an SMS provider is configured.");
        }

        if (!environment.IsDevelopment() &&
            !string.Equals(
                emailProvider,
                NotificationDeliveryOptions.ResendProvider,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Production NotificationDelivery:EmailProvider must be Resend.");
        }

        if (!string.Equals(
                emailProvider,
                NotificationDeliveryOptions.ResendProvider,
                StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var apiKey = configuration[$"{ResendOptions.SectionName}:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Resend:ApiKey must be configured.");

        var fromEmail = configuration[$"{ResendOptions.SectionName}:FromEmail"];
        if (string.IsNullOrWhiteSpace(fromEmail) || !IsValidEmailAddress(fromEmail))
            throw new InvalidOperationException("Resend:FromEmail must be a valid email address.");

        if (string.IsNullOrWhiteSpace(configuration[$"{ResendOptions.SectionName}:FromName"]))
            throw new InvalidOperationException("Resend:FromName must be configured.");

        var baseUrl = configuration[$"{ResendOptions.SectionName}:BaseUrl"];
        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var resendUri) ||
            !string.Equals(resendUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Resend:BaseUrl must be an absolute HTTPS URL.");
        }
    }

    private static bool IsValidEmailAddress(string value)
    {
        try
        {
            var address = new MailAddress(value);
            return string.Equals(address.Address, value.Trim(), StringComparison.OrdinalIgnoreCase);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
