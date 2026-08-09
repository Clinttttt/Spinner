using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Features.Notifications.ResendNotification;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Notifications;

/// <summary>
/// Recovering messages that gave up. A message which exhausts its attempts is otherwise
/// finished for good — right when the address is undeliverable, wrong when the fault was
/// ours. Sending from an unverified domain rejected every customer receipt for weeks and
/// none of them could be recovered afterwards.
/// </summary>
public sealed class ResendNotificationTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 8, 9, 22, 0, 0, TimeSpan.FromHours(8));

    [Fact]
    public async Task Should_Queue_A_Failed_Message_Again()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var message = await AddMessageAsync(dbContext);

        message.MarkFailed("Resend rejected email delivery with HTTP status 422.", Now);
        await dbContext.SaveChangesAsync();

        var result = await Resend(dbContext, message.Id);

        Assert.True(result.IsSuccess);

        var stored = await dbContext.NotificationOutboxMessages.AsNoTracking().SingleAsync();
        Assert.Equal(NotificationStatus.Pending, stored.Status);
        Assert.Null(stored.LastError);
    }

    [Fact]
    public async Task Should_Reset_The_Attempts_So_The_Outbox_Picks_It_Up()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var message = await AddMessageAsync(dbContext);

        // Spent, which is exactly the state that made these unrecoverable.
        for (var attempt = 0; attempt < 3; attempt++)
            message.MarkFailed("Rejected.", Now);

        await dbContext.SaveChangesAsync();
        Assert.Equal(3, message.AttemptCount);

        await Resend(dbContext, message.Id);

        var stored = await dbContext.NotificationOutboxMessages.AsNoTracking().SingleAsync();

        // Reset rather than incremented. The limit exists to stop a doomed message being
        // retried for ever; the owner asking for this is a deliberate act, not a loop.
        Assert.Equal(0, stored.AttemptCount);
        Assert.True(stored.IsClaimable(Now, 3));
    }

    [Fact]
    public async Task Should_Refuse_To_Resend_Something_Already_Delivered()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var message = await AddMessageAsync(dbContext);

        message.MarkSent(Now);
        await dbContext.SaveChangesAsync();

        var result = await Resend(dbContext, message.Id);

        // Otherwise the customer gets a second copy of a receipt they already have.
        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);

        var stored = await dbContext.NotificationOutboxMessages.AsNoTracking().SingleAsync();
        Assert.Equal(NotificationStatus.Sent, stored.Status);
    }

    [Fact]
    public async Task Should_Refuse_While_It_Is_Being_Sent()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var message = await AddMessageAsync(dbContext);

        // The lease is relative to real time because the handler asks the clock itself.
        // A fixed timestamp would drift into the past and the claim would read as
        // abandoned, which is a different case entirely.
        message.Claim(Guid.NewGuid(), DateTimeOffset.UtcNow.AddMinutes(5));
        await dbContext.SaveChangesAsync();

        var result = await Resend(dbContext, message.Id);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task Should_Allow_A_Message_Whose_Claim_Was_Abandoned()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var message = await AddMessageAsync(dbContext);

        // A worker that died mid-send leaves the claim behind. Once the lease lapses the
        // message is nobody's, so the owner may ask for it again.
        message.Claim(Guid.NewGuid(), DateTimeOffset.UtcNow.AddMinutes(-1));
        await dbContext.SaveChangesAsync();

        var result = await Resend(dbContext, message.Id);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Should_Report_A_Notification_That_Does_Not_Exist()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await Resend(dbContext, Guid.NewGuid());

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.NotFound, result.Status);
    }

    [Fact]
    public async Task Should_Actually_Send_On_The_Next_Outbox_Run()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var message = await AddMessageAsync(dbContext);

        for (var attempt = 0; attempt < 3; attempt++)
            message.MarkFailed("Rejected.", Now);

        await dbContext.SaveChangesAsync();

        await Resend(dbContext, message.Id);

        // The point of the whole feature: the worker delivers it without further help.
        var sender = new CountingSender();
        await Processor(dbContext, sender).ProcessPendingAsync(CancellationToken.None);

        Assert.Equal(1, sender.SendCount);

        var stored = await dbContext.NotificationOutboxMessages.AsNoTracking().SingleAsync();
        Assert.Equal(NotificationStatus.Sent, stored.Status);
    }

    private static async Task<NotificationOutboxMessage> AddMessageAsync(
        Spinner.Api.Database.AppDbContext dbContext)
    {
        var message = new NotificationOutboxMessage(
            NotificationChannel.Email,
            "customer@example.com",
            "Your laundry digital receipt",
            "Payment received for ES-TEST.",
            Now);

        dbContext.NotificationOutboxMessages.Add(message);
        await dbContext.SaveChangesAsync();

        return message;
    }

    private static Task<Result> Resend(
        Spinner.Api.Database.AppDbContext dbContext,
        Guid notificationId) =>
        new ResendNotificationHandler(dbContext)
            .Handle(new ResendNotificationCommand(notificationId), CancellationToken.None);

    private static Spinner.Api.Features.Notifications.ProcessNotificationOutbox.NotificationOutboxProcessor Processor(
        Spinner.Api.Database.AppDbContext dbContext,
        Spinner.Api.Integrations.Notifications.INotificationSender sender) =>
        new(
            dbContext,
            sender,
            Microsoft.Extensions.Options.Options.Create(
                new Spinner.Api.Features.Notifications.ProcessNotificationOutbox.NotificationOutboxOptions()),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<
                Spinner.Api.Features.Notifications.ProcessNotificationOutbox.NotificationOutboxProcessor>.Instance);

    private sealed class CountingSender : Spinner.Api.Integrations.Notifications.INotificationSender
    {
        public int SendCount { get; private set; }

        public Task<Spinner.Api.Integrations.Notifications.NotificationSendResult> SendAsync(
            NotificationOutboxMessage message,
            CancellationToken cancellationToken)
        {
            SendCount++;
            return Task.FromResult(
                Spinner.Api.Integrations.Notifications.NotificationSendResult.Success());
        }
    }
}
