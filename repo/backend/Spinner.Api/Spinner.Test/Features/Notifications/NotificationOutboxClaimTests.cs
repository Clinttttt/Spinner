using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Features.Notifications.ProcessNotificationOutbox;
using Spinner.Api.Integrations.Notifications;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Notifications;

/// <summary>
/// The outbox used to send a message and only then record that it had been sent.
/// Anything else looking for work in that gap saw it as still waiting, so a customer
/// could be sent the same receipt or status message twice.
/// </summary>
public sealed class NotificationOutboxClaimTests
{
    [Fact]
    public async Task Should_Not_Send_The_Same_Message_Twice_When_Two_Workers_Run_Together()
    {
        // Two contexts over one store, which is what two API instances look like.
        var (first, second) = AppDbContextFactory.CreatePair();
        await using var firstContext = first;
        await using var secondContext = second;

        await AddPendingAsync(firstContext);

        var firstSender = new CountingSender();
        var secondSender = new CountingSender();

        await Processor(firstContext, firstSender).ProcessPendingAsync(CancellationToken.None);
        await Processor(secondContext, secondSender).ProcessPendingAsync(CancellationToken.None);

        Assert.Equal(1, firstSender.SendCount + secondSender.SendCount);
    }

    [Fact]
    public async Task Should_Mark_A_Message_As_Being_Processed_Before_Sending_It()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await AddPendingAsync(dbContext);

        NotificationStatus? statusDuringSend = null;
        var sender = new CallbackSender(() =>
        {
            statusDuringSend = dbContext.NotificationOutboxMessages
                .AsNoTracking()
                .Single()
                .Status;
        });

        await Processor(dbContext, sender).ProcessPendingAsync(CancellationToken.None);

        // The whole point: while the provider call is in flight the row must not look
        // available to anybody else.
        Assert.Equal(NotificationStatus.Processing, statusDuringSend);
    }

    [Fact]
    public async Task Should_Retry_A_Message_Whose_Claim_Was_Abandoned()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await AddPendingAsync(dbContext);

        // A worker that died mid-send leaves the row claimed. Once the lease lapses
        // the message has to become available again, or the customer never hears back.
        var message = await dbContext.NotificationOutboxMessages.SingleAsync();
        message.Claim(Guid.NewGuid(), DateTimeOffset.UtcNow.AddMinutes(-1));
        await dbContext.SaveChangesAsync();

        var sender = new CountingSender();
        await Processor(dbContext, sender).ProcessPendingAsync(CancellationToken.None);

        Assert.Equal(1, sender.SendCount);
        Assert.Equal(
            NotificationStatus.Sent,
            (await dbContext.NotificationOutboxMessages.AsNoTracking().SingleAsync()).Status);
    }

    [Fact]
    public async Task Should_Leave_A_Live_Claim_Alone()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await AddPendingAsync(dbContext);

        var message = await dbContext.NotificationOutboxMessages.SingleAsync();
        message.Claim(Guid.NewGuid(), DateTimeOffset.UtcNow.AddMinutes(5));
        await dbContext.SaveChangesAsync();

        var sender = new CountingSender();
        await Processor(dbContext, sender).ProcessPendingAsync(CancellationToken.None);

        Assert.Equal(0, sender.SendCount);
    }

    private static async Task AddPendingAsync(Spinner.Api.Database.AppDbContext dbContext)
    {
        dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
            NotificationChannel.Email,
            "customer@example.com",
            "Your laundry is ready",
            "Your order is ready for delivery.",
            DateTimeOffset.UtcNow));

        await dbContext.SaveChangesAsync();
    }

    private static NotificationOutboxProcessor Processor(
        Spinner.Api.Database.AppDbContext dbContext,
        INotificationSender sender) =>
        new(
            dbContext,
            sender,
            new OptionsWrapper<NotificationOutboxOptions>(new NotificationOutboxOptions()),
            NullLogger<NotificationOutboxProcessor>.Instance);

    private sealed class CountingSender : INotificationSender
    {
        public int SendCount { get; private set; }

        public Task<NotificationSendResult> SendAsync(
            NotificationOutboxMessage message,
            CancellationToken cancellationToken)
        {
            SendCount++;
            return Task.FromResult(NotificationSendResult.Success());
        }
    }

    private sealed class CallbackSender : INotificationSender
    {
        private readonly Action _onSend;

        public CallbackSender(Action onSend)
        {
            _onSend = onSend;
        }

        public Task<NotificationSendResult> SendAsync(
            NotificationOutboxMessage message,
            CancellationToken cancellationToken)
        {
            _onSend();
            return Task.FromResult(NotificationSendResult.Success());
        }
    }
}
