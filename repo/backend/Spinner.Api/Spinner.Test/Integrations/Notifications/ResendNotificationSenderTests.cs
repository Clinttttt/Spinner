using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Integrations.Notifications;

namespace Spinner.Test.Integrations.Notifications;

public sealed class ResendNotificationSenderTests
{
    [Fact]
    public async Task SendAsync_Should_Send_Email_With_Authentication_And_Idempotency()
    {
        var handler = new RecordingHttpMessageHandler(HttpStatusCode.OK);
        using var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.resend.com/")
        };
        var sender = CreateSender(httpClient);
        var message = CreateEmailMessage();

        var result = await sender.SendAsync(message, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(new Uri("https://api.resend.com/emails"), handler.RequestUri);
        Assert.Equal("Bearer", handler.Authorization?.Scheme);
        Assert.Equal("re_test_key", handler.Authorization?.Parameter);
        Assert.Equal(
            $"spinner-notification-{message.Id:N}",
            handler.IdempotencyKey);

        using var payload = JsonDocument.Parse(handler.Content!);
        var root = payload.RootElement;
        Assert.Equal(
            "Engr. Spin Laundromat <notifications@example.com>",
            root.GetProperty("from").GetString());
        Assert.Equal("owner@example.com", root.GetProperty("to")[0].GetString());
        Assert.Equal("Verify your account", root.GetProperty("subject").GetString());
        Assert.Equal("Your verification code is 123456.", root.GetProperty("text").GetString());
        Assert.Contains(
            "Your verification code is 123456.",
            root.GetProperty("html").GetString(),
            StringComparison.Ordinal);
    }

    [Fact]
    public async Task SendAsync_Should_Return_Failure_When_Resend_Rejects_Email()
    {
        var handler = new RecordingHttpMessageHandler(HttpStatusCode.UnprocessableEntity);
        using var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.resend.com/")
        };
        var sender = CreateSender(httpClient);

        var result = await sender.SendAsync(CreateEmailMessage(), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(
            "Resend rejected email delivery with HTTP status 422.",
            result.ErrorMessage);
    }

    [Fact]
    public async Task SendAsync_Should_Reject_NonEmail_Notification()
    {
        var handler = new RecordingHttpMessageHandler(HttpStatusCode.OK);
        using var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.resend.com/")
        };
        var sender = CreateSender(httpClient);
        var message = new NotificationOutboxMessage(
            NotificationChannel.Sms,
            "09171234567",
            null,
            "Test message.",
            DateTimeOffset.UtcNow);

        var result = await sender.SendAsync(message, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal("Resend only supports email notifications.", result.ErrorMessage);
        Assert.Null(handler.RequestUri);
    }

    [Fact]
    public async Task SendAsync_Should_Show_The_Shop_Logo_When_One_Is_Configured()
    {
        // Emails went out as a bare paragraph, which read as a system notice rather than
        // something the laundromat sent.
        var handler = new RecordingHttpMessageHandler(HttpStatusCode.OK);
        using var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.resend.com/")
        };

        var result = await CreateSender(
            httpClient,
            "https://spinlaundry.online/assets/email-logo.png")
            .SendAsync(CreateEmailMessage(), CancellationToken.None);

        Assert.True(result.IsSuccess);

        using var payload = JsonDocument.Parse(handler.Content!);
        var html = payload.RootElement.GetProperty("html").GetString()!;

        Assert.Contains("email-logo.png", html, StringComparison.Ordinal);
        Assert.Contains("Engr. Spin Laundromat", html, StringComparison.Ordinal);

        // The message itself must survive the letterhead.
        Assert.Contains(
            "Your verification code is 123456.",
            html,
            StringComparison.Ordinal);

        // And the plain text part stays intact for clients that show no HTML, and for
        // anyone who blocks images.
        Assert.Equal(
            "Your verification code is 123456.",
            payload.RootElement.GetProperty("text").GetString());
    }

    [Fact]
    public async Task SendAsync_Should_Omit_The_Image_When_No_Logo_Is_Configured()
    {
        // A broken image in a receipt looks worse than no image, so an unconfigured logo
        // means none is referenced at all.
        var handler = new RecordingHttpMessageHandler(HttpStatusCode.OK);
        using var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.resend.com/")
        };

        await CreateSender(httpClient).SendAsync(CreateEmailMessage(), CancellationToken.None);

        using var payload = JsonDocument.Parse(handler.Content!);
        var html = payload.RootElement.GetProperty("html").GetString()!;

        Assert.DoesNotContain("<img", html, StringComparison.Ordinal);
        Assert.Contains(
            "Your verification code is 123456.",
            html,
            StringComparison.Ordinal);
    }

    private static ResendNotificationSender CreateSender(
        HttpClient httpClient,
        string logoUrl = "")
    {
        return new ResendNotificationSender(
            httpClient,
            Options.Create(new ResendOptions
            {
                ApiKey = "re_test_key",
                FromEmail = "notifications@example.com",
                FromName = "Engr. Spin Laundromat",
                DefaultSubject = "Engr. Spin Laundromat Update",
                LogoUrl = logoUrl
            }),
            NullLogger<ResendNotificationSender>.Instance);
    }

    private static NotificationOutboxMessage CreateEmailMessage()
    {
        return new NotificationOutboxMessage(
            NotificationChannel.Email,
            "owner@example.com",
            "Verify your account",
            "Your verification code is 123456.",
            DateTimeOffset.UtcNow);
    }

    private sealed class RecordingHttpMessageHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;

        public RecordingHttpMessageHandler(HttpStatusCode statusCode)
        {
            _statusCode = statusCode;
        }

        public Uri? RequestUri { get; private set; }
        public AuthenticationHeaderValue? Authorization { get; private set; }
        public string? IdempotencyKey { get; private set; }
        public string? Content { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestUri = request.RequestUri;
            Authorization = request.Headers.Authorization;
            IdempotencyKey = request.Headers.TryGetValues("Idempotency-Key", out var values)
                ? values.Single()
                : null;
            Content = request.Content is null
                ? null
                : await request.Content.ReadAsStringAsync(cancellationToken);

            return new HttpResponseMessage(_statusCode);
        }
    }
}
