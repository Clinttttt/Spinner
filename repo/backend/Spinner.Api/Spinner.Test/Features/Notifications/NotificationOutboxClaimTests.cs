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

    [Fact]
    public async Task Should_Give_The_Sender_The_Order_So_A_Push_Can_Reference_It()
    {
        // Two contexts on purpose. Within one context the in-memory provider fills in
        // navigation properties from whatever it is already tracking, which would make
        // this pass whether or not the order is actually loaded. A second context has
        // nothing tracked, so the order arrives only if the query asked for it — which is
        // how PostgreSQL behaves in either case.
        var (seeding, processing) = AppDbContextFactory.CreatePair();
        await using var seedingContext = seeding;
        await using var processingContext = processing;

        await BookingTestData.CreateBookingAsync(seedingContext);
        var order = await seedingContext.LaundryOrders.AsNoTracking().FirstAsync();

        // A push carries the order code so tapping the notification can open that order.
        // The code lives on the order rather than the message, so without it being loaded
        // the sender would quietly send an empty code and the tap would open a bare list.
        var sender = new CapturingSender();
        await Processor(processingContext, sender).ProcessPendingAsync(CancellationToken.None);

        var withOrder = sender.Seen.Where(message => message.OrderId is not null).ToList();

        Assert.NotEmpty(withOrder);
        Assert.All(
            withOrder,
            message => Assert.Equal(order.OrderCode, message.Order?.OrderCode));
    }

    [Fact]
    public async Task Should_Finish_The_Batch_When_One_Message_Loses_Its_Claim_Mid_Send()
    {
        // What this reproduces: a send that outlasts its lease. Another worker re-claims
        // the row, so recording the outcome fails on the concurrency stamp.
        //
        // That exception used to escape the loop, which took every message claimed behind
        // it down as well — they were left as Processing until their own leases lapsed. A
        // failed save also leaves the entity tracked with the stamp it read, so even
        // catching it was not enough: the next message's save would be rejected for this
        // message's conflict, and so would every one after it.
        //
        // Two overlapping workers is not hypothetical here: a Container Apps revision swap
        // runs both briefly, and that is exactly when a batch of receipts would stall.
        var (processing, other) = AppDbContextFactory.CreatePair();
        await using var processingContext = processing;
        await using var otherContext = other;

        var older = new NotificationOutboxMessage(
            NotificationChannel.Email,
            "first@example.com",
            "First",
            "First message.",
            DateTimeOffset.UtcNow.AddMinutes(-5));

        var newer = new NotificationOutboxMessage(
            NotificationChannel.Email,
            "second@example.com",
            "Second",
            "Second message.",
            DateTimeOffset.UtcNow);

        processingContext.NotificationOutboxMessages.AddRange(older, newer);
        await processingContext.SaveChangesAsync();

        var stolen = false;
        var sender = new CallbackSender(() =>
        {
            // Steal the claim once, while the first message is in flight.
            if (stolen) return;
            stolen = true;

            var target = otherContext.NotificationOutboxMessages
                .Single(message => message.Recipient == "first@example.com");
            target.Claim(Guid.NewGuid(), DateTimeOffset.UtcNow.AddMinutes(5));
            otherContext.SaveChanges();
        });

        // Must not throw.
        await Processor(processingContext, sender).ProcessPendingAsync(CancellationToken.None);

        var messages = await otherContext.NotificationOutboxMessages
            .AsNoTracking()
            .ToListAsync();

        // The second message went out and its outcome was recorded, rather than being
        // abandoned because the first one conflicted.
        var second = messages.Single(message => message.Recipient == "second@example.com");
        Assert.Equal(NotificationStatus.Sent, second.Status);

        // The first is left to the worker that owns it now, not overwritten.
        var first = messages.Single(message => message.Recipient == "first@example.com");
        Assert.Equal(NotificationStatus.Processing, first.Status);
    }

    [Fact]
    public async Task Should_Hold_A_Failed_Message_Back_Before_Trying_It_Again()
    {
        // The attempt limit used to be spent in about a minute: the worker polls every
        // thirty seconds and nothing held a failed message back, so a provider having one
        // bad minute cost the customer their receipt permanently.
        await using var dbContext = AppDbContextFactory.Create();
        await AddPendingAsync(dbContext);

        var rejecting = new RejectingSender();
        var processor = Processor(dbContext, rejecting);

        await processor.ProcessPendingAsync(CancellationToken.None);
        Assert.Equal(1, rejecting.SendCount);

        // Immediately afterwards the message is still inside its backoff, so a second pass
        // must not touch it.
        await processor.ProcessPendingAsync(CancellationToken.None);
        Assert.Equal(1, rejecting.SendCount);

        var message = await dbContext.NotificationOutboxMessages.SingleAsync();
        Assert.Equal(NotificationStatus.Failed, message.Status);
        Assert.NotNull(message.LockedUntil);

        // Once the wait has passed it becomes available again.
        Assert.True(message.IsClaimable(message.LockedUntil!.Value.AddSeconds(1), 3));
        Assert.False(message.IsClaimable(message.LockedUntil!.Value.AddSeconds(-1), 3));
    }

    [Fact]
    public void A_Resend_Requested_By_The_Owner_Ignores_The_Backoff()
    {
        // The wait is there to ride out a provider blip, not to make the owner watch a
        // clock after they have pressed Send again.
        var now = DateTimeOffset.UtcNow;
        var message = new NotificationOutboxMessage(
            NotificationChannel.Email,
            "customer@example.com",
            "Receipt",
            "Your receipt.",
            now);

        message.MarkFailed("Rejected.", now, TimeSpan.FromMinutes(30));
        Assert.False(message.IsClaimable(now, 3));

        Assert.True(message.Requeue(now).IsSuccess);
        Assert.True(message.IsClaimable(now, 3));
    }

    private sealed class RejectingSender : INotificationSender
    {
        public int SendCount { get; private set; }

        public Task<NotificationSendResult> SendAsync(
            NotificationOutboxMessage message,
            CancellationToken cancellationToken)
        {
            SendCount++;
            return Task.FromResult(NotificationSendResult.Failure("Provider unavailable."));
        }
    }

    private sealed class CapturingSender : INotificationSender
    {
        public List<NotificationOutboxMessage> Seen { get; } = [];

        public Task<NotificationSendResult> SendAsync(
            NotificationOutboxMessage message,
            CancellationToken cancellationToken)
        {
            Seen.Add(message);
            return Task.FromResult(NotificationSendResult.Success());
        }
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
