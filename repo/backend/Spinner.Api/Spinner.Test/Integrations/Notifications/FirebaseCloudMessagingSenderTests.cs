using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Integrations.Notifications;

namespace Spinner.Test.Integrations.Notifications;

/// <summary>
/// The sender's job is to tell a message worth retrying apart from a device worth giving
/// up on. Getting that backwards either loses notifications or retries a dead phone on
/// every booking for ever.
/// </summary>
public sealed class FirebaseCloudMessagingSenderTests
{
    private const string Token = "fcm-token-abc123";

    [Fact]
    public async Task Should_Report_Success_When_Firebase_Accepts_It()
    {
        var registry = new RecordingRegistry();
        var sender = Create(HttpStatusCode.OK, "{\"name\":\"projects/x/messages/1\"}", registry);

        var result = await sender.SendAsync(Message(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(registry.Retired);
    }

    [Fact]
    public async Task Should_Retire_A_Device_Firebase_Does_Not_Recognise()
    {
        var registry = new RecordingRegistry();
        var sender = Create(
            HttpStatusCode.NotFound,
            "{\"error\":{\"status\":\"NOT_FOUND\",\"message\":\"Requested entity was not found.\"}}",
            registry);

        var result = await sender.SendAsync(Message(), CancellationToken.None);

        // The phone has been wiped or reinstalled. Left registered, it would queue a
        // message that can never arrive on every future booking.
        Assert.False(result.IsSuccess);
        Assert.Equal(new[] { Token }, registry.Retired);
    }

    [Fact]
    public async Task Should_Retire_A_Device_Firebase_Calls_Unregistered()
    {
        var registry = new RecordingRegistry();
        var sender = Create(
            HttpStatusCode.BadRequest,
            "{\"error\":{\"details\":[{\"errorCode\":\"UNREGISTERED\"}]}}",
            registry);

        await sender.SendAsync(Message(), CancellationToken.None);

        Assert.Equal(new[] { Token }, registry.Retired);
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    public async Task Should_Keep_A_Device_When_The_Problem_Is_Temporary(HttpStatusCode status)
    {
        var registry = new RecordingRegistry();
        var sender = Create(status, "{\"error\":{\"status\":\"UNAVAILABLE\"}}", registry);

        var result = await sender.SendAsync(Message(), CancellationToken.None);

        // Firebase being busy or briefly down says nothing about the phone. Retiring it
        // here would silently stop the shop being notified at all.
        Assert.False(result.IsSuccess);
        Assert.Empty(registry.Retired);
    }

    [Fact]
    public async Task Should_Keep_A_Device_When_Firebase_Is_Unreachable()
    {
        var registry = new RecordingRegistry();
        var sender = new FirebaseCloudMessagingSender(
            new HttpClient(new ThrowingHandler()),
            new StubTokenProvider(),
            registry,
            Options.Create(Configured()),
            NullLogger<FirebaseCloudMessagingSender>.Instance);

        var result = await sender.SendAsync(Message(), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(registry.Retired);
    }

    [Fact]
    public async Task Should_Say_So_When_Push_Is_Not_Configured_Yet()
    {
        var registry = new RecordingRegistry();
        var sender = new FirebaseCloudMessagingSender(
            new HttpClient(new ThrowingHandler()),
            new StubTokenProvider(),
            registry,
            Options.Create(new FirebaseMessagingOptions()),
            NullLogger<FirebaseCloudMessagingSender>.Instance);

        var result = await sender.SendAsync(Message(), CancellationToken.None);

        // Must not reach the network, and must not retire the device either.
        Assert.False(result.IsSuccess);
        Assert.Contains("not configured", result.ErrorMessage);
        Assert.Empty(registry.Retired);
    }

    [Fact]
    public async Task Should_Report_A_Credential_Problem_Rather_Than_Blaming_The_Device()
    {
        var registry = new RecordingRegistry();
        var sender = new FirebaseCloudMessagingSender(
            new HttpClient(new StubHandler(HttpStatusCode.OK, "{}")),
            new FailingTokenProvider(),
            registry,
            Options.Create(Configured()),
            NullLogger<FirebaseCloudMessagingSender>.Instance);

        var result = await sender.SendAsync(Message(), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("service account", result.ErrorMessage);
        Assert.Empty(registry.Retired);
    }

    [Fact]
    public async Task Should_Address_The_Message_To_The_Device_And_Carry_The_Order()
    {
        var handler = new StubHandler(HttpStatusCode.OK, "{}");
        var sender = new FirebaseCloudMessagingSender(
            new HttpClient(handler),
            new StubTokenProvider(),
            new RecordingRegistry(),
            Options.Create(Configured()),
            NullLogger<FirebaseCloudMessagingSender>.Instance);

        var message = Message();
        await sender.SendAsync(message, CancellationToken.None);

        Assert.Contains(Token, handler.LastBody);
        Assert.Contains("New booking", handler.LastBody);
        // Carried so tapping the notification can open the order it refers to.
        Assert.Contains(message.OrderId!.Value.ToString(), handler.LastBody);
        Assert.Contains("spinner-project", handler.LastRequestUri);
    }

    private static FirebaseMessagingOptions Configured() => new()
    {
        ProjectId = "spinner-project",
        ServiceAccountJson = "{\"type\":\"service_account\"}",
    };

    private static FirebaseCloudMessagingSender Create(
        HttpStatusCode status,
        string body,
        IStaffDeviceRegistry registry) =>
        new(
            new HttpClient(new StubHandler(status, body)),
            new StubTokenProvider(),
            registry,
            Options.Create(Configured()),
            NullLogger<FirebaseCloudMessagingSender>.Instance);

    private static NotificationOutboxMessage Message() =>
        new(
            Guid.NewGuid(),
            NotificationChannel.Push,
            Token,
            "New booking",
            "Maria Santos booked Wash, Dry & Fold for 8 Aug, 08:00-10:00.",
            DateTimeOffset.UtcNow);

    private sealed class StubTokenProvider : IFirebaseAccessTokenProvider
    {
        public Task<string> GetAccessTokenAsync(CancellationToken cancellationToken) =>
            Task.FromResult("stub-access-token");
    }

    private sealed class FailingTokenProvider : IFirebaseAccessTokenProvider
    {
        public Task<string> GetAccessTokenAsync(CancellationToken cancellationToken) =>
            throw new InvalidOperationException("Bad key.");
    }

    private sealed class RecordingRegistry : IStaffDeviceRegistry
    {
        public List<string> Retired { get; } = [];

        public Task RetireAsync(string registrationToken, CancellationToken cancellationToken)
        {
            Retired.Add(registrationToken);
            return Task.CompletedTask;
        }
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _status;
        private readonly string _body;

        public StubHandler(HttpStatusCode status, string body)
        {
            _status = status;
            _body = body;
        }

        public string LastBody { get; private set; } = string.Empty;
        public string LastRequestUri { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            LastRequestUri = request.RequestUri?.ToString() ?? string.Empty;
            LastBody = request.Content is null
                ? string.Empty
                : await request.Content.ReadAsStringAsync(cancellationToken);

            return new HttpResponseMessage(_status)
            {
                Content = new StringContent(_body),
            };
        }
    }

    private sealed class ThrowingHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            throw new HttpRequestException("No route to host.");
    }
}
