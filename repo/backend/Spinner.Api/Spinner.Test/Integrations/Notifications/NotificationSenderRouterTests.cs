using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Integrations.Notifications;

namespace Spinner.Test.Integrations.Notifications;

public sealed class NotificationSenderRouterTests
{
    [Fact]
    public async Task SendAsync_Should_Route_Email_To_Resend_Provider()
    {
        var emailSender = new FakeEmailNotificationSender();
        var router = CreateRouter(emailSender);
        var message = CreateMessage(NotificationChannel.Email, "owner@example.com");

        var result = await router.SendAsync(message, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Same(message, emailSender.LastMessage);
    }

    [Fact]
    public async Task SendAsync_Should_Keep_Sms_On_Logging_Provider()
    {
        var emailSender = new FakeEmailNotificationSender();
        var router = CreateRouter(emailSender);

        var result = await router.SendAsync(
            CreateMessage(NotificationChannel.Sms, "09171234567"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Null(emailSender.LastMessage);
    }

    private static NotificationSenderRouter CreateRouter(
        FakeEmailNotificationSender emailSender)
    {
        var environment = new TestEnvironment();
        var loggingSender = new LoggingNotificationSender(
            NullLogger<LoggingNotificationSender>.Instance,
            environment);

        return new NotificationSenderRouter(
            emailSender,
            // Unconfigured on purpose: this test is about which sender is chosen, and an
            // unconfigured Firebase reports that for itself rather than reaching out.
            new FirebaseCloudMessagingSender(
                new HttpClient(),
                new UnusedAccessTokenProvider(),
                new UnusedDeviceRegistry(),
                Options.Create(new FirebaseMessagingOptions()),
                NullLogger<FirebaseCloudMessagingSender>.Instance),
            loggingSender,
            Options.Create(new NotificationDeliveryOptions
            {
                EmailProvider = NotificationDeliveryOptions.ResendProvider,
                SmsProvider = NotificationDeliveryOptions.LoggingProvider
            }));
    }

    private sealed class UnusedAccessTokenProvider : IFirebaseAccessTokenProvider
    {
        public Task<string> GetAccessTokenAsync(CancellationToken cancellationToken) =>
            throw new InvalidOperationException("Should not be reached.");
    }

    private sealed class UnusedDeviceRegistry : IStaffDeviceRegistry
    {
        public Task RetireAsync(string registrationToken, CancellationToken cancellationToken) =>
            Task.CompletedTask;
    }

    private static NotificationOutboxMessage CreateMessage(
        NotificationChannel channel,
        string recipient)
    {
        return new NotificationOutboxMessage(
            channel,
            recipient,
            "Test notification",
            "Test message.",
            DateTimeOffset.UtcNow);
    }

    private sealed class FakeEmailNotificationSender : IEmailNotificationSender
    {
        public NotificationOutboxMessage? LastMessage { get; private set; }

        public Task<NotificationSendResult> SendAsync(
            NotificationOutboxMessage message,
            CancellationToken cancellationToken)
        {
            LastMessage = message;
            return Task.FromResult(NotificationSendResult.Success());
        }
    }

    private sealed class TestEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "Spinner.Test";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider ContentRootFileProvider { get; set; } =
            new NullFileProvider();
    }
}
