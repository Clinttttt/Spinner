using System.Net.Mail;
using Spinner.Api.Features.Notifications.ProcessNotificationOutbox;
using Spinner.Api.Integrations.Media;
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
        ValidateMediaStorage(configuration, environment);

        if (environment.IsDevelopment())
            return;

        if (jwtKey.Contains("SuperSecretKey", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Production Jwt:Key must not use the development secret.");

        // Only demanded when the legacy self-signed webhook is actually open. It is closed by
        // default now that PayMongo is the gateway, and insisting on a 32-character secret
        // for a route that refuses every call was asking the deployment to carry a key to a
        // door that is locked.
        var legacyWebhookEnabled = configuration.GetValue<bool>(
            $"{OnlinePaymentOptions.SectionName}:EnableLegacyWebhook");

        if (legacyWebhookEnabled)
        {
            var webhookSecret = configuration[$"{OnlinePaymentOptions.SectionName}:WebhookSecret"];
            if (string.IsNullOrWhiteSpace(webhookSecret) || webhookSecret.Length < 32)
                throw new InvalidOperationException("OnlinePayments:WebhookSecret must be configured and at least 32 characters long when OnlinePayments:EnableLegacyWebhook is true.");

            if (string.Equals(webhookSecret, DevelopmentWebhookSecret, StringComparison.Ordinal))
                throw new InvalidOperationException("Production OnlinePayments:WebhookSecret must not use the development secret.");
        }

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

    /// <summary>
    /// Checks the image storage settings only when they are present.
    /// </summary>
    /// <remarks>
    /// Image upload is optional, like online payment: a deployment without it refuses uploads
    /// with a clear message and the owner can still point the logo at a link. What must not
    /// happen is a half-configured one, where the app offers an upload button that fails on
    /// every press. So the moment any one of the four settings appears, all four are required.
    /// </remarks>
    private static void ValidateMediaStorage(
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var section = MediaStorageOptions.SectionName;
        var names = new[] { "AccountId", "AccessKeyId", "SecretAccessKey", "BucketName" };
        var supplied = names
            .Where(name => !string.IsNullOrWhiteSpace(configuration[$"{section}:{name}"]))
            .ToArray();

        if (supplied.Length == 0)
            return;

        var missing = names.Except(supplied, StringComparer.Ordinal).ToArray();
        if (missing.Length > 0)
        {
            throw new InvalidOperationException(
                $"{section} is partly configured. Missing: " +
                string.Join(", ", missing.Select(name => $"{section}:{name}")) + ".");
        }

        var maxUploadBytes =
            configuration.GetValue<int?>($"{section}:MaxUploadBytes") ??
            new MediaStorageOptions().MaxUploadBytes;

        if (maxUploadBytes <= 0)
            throw new InvalidOperationException($"{section}:MaxUploadBytes must be greater than zero.");

        // Above the ceiling the endpoint would refuse the request before the application could
        // explain why, so the owner would see a dead connection rather than a message.
        if (maxUploadBytes > MediaStorageOptions.RequestBodyByteCeiling)
        {
            throw new InvalidOperationException(
                $"{section}:MaxUploadBytes must not exceed " +
                $"{MediaStorageOptions.RequestBodyByteCeiling} bytes, the request size limit " +
                "applied by the upload endpoints.");
        }

        if (environment.IsDevelopment())
            return;

        // Absolute, because this address is written into the shop's settings and then into
        // emails, where a relative path means a broken image.
        var publicBaseUrl = configuration[$"{section}:PublicBaseUrl"];
        if (!Uri.TryCreate(publicBaseUrl, UriKind.Absolute, out var mediaUri) ||
            !string.Equals(mediaUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"{section}:PublicBaseUrl must be an absolute HTTPS URL when image storage is " +
                "configured. Stored image addresses end up in emails, which cannot follow a " +
                "relative path.");
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
