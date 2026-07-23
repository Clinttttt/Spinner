using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Spinner.Api.Database;
using Spinner.Api.Domain.Customers;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Notifications.GetNotificationHistory;
using Spinner.Api.Features.Notifications.ProcessNotificationOutbox;
using Spinner.Api.Integrations.Notifications;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Notifications;

public sealed class NotificationOutboxProcessorTests
{
    [Fact]
    public async Task ProcessPendingAsync_Should_Mark_Pending_Message_Sent_When_Sender_Succeeds()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var message = await SeedNotificationAsync(dbContext);
        var processor = CreateProcessor(dbContext, new FakeNotificationSender(NotificationSendResult.Success()));

        var processed = await processor.ProcessPendingAsync(CancellationToken.None);

        var saved = await dbContext.NotificationOutboxMessages.SingleAsync(item => item.Id == message.Id);
        Assert.Equal(1, processed);
        Assert.Equal(NotificationStatus.Sent, saved.Status);
        Assert.Equal(1, saved.AttemptCount);
        Assert.Null(saved.LastError);
        Assert.NotNull(saved.SentAt);
    }

    [Fact]
    public async Task ProcessPendingAsync_Should_Mark_Message_Failed_When_Sender_Fails()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var message = await SeedNotificationAsync(dbContext);
        var processor = CreateProcessor(
            dbContext,
            new FakeNotificationSender(NotificationSendResult.Failure("SMS provider unavailable.")));

        var processed = await processor.ProcessPendingAsync(CancellationToken.None);

        var saved = await dbContext.NotificationOutboxMessages.SingleAsync(item => item.Id == message.Id);
        Assert.Equal(1, processed);
        Assert.Equal(NotificationStatus.Failed, saved.Status);
        Assert.Equal(1, saved.AttemptCount);
        Assert.Equal("SMS provider unavailable.", saved.LastError);
        Assert.Null(saved.SentAt);
    }

    [Fact]
    public async Task ProcessPendingAsync_Should_Retry_Failed_Message_Below_Max_Attempts()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var message = await SeedNotificationAsync(dbContext);
        message.MarkFailed("Temporary failure.", DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync();
        var processor = CreateProcessor(dbContext, new FakeNotificationSender(NotificationSendResult.Success()));

        var processed = await processor.ProcessPendingAsync(CancellationToken.None);

        var saved = await dbContext.NotificationOutboxMessages.SingleAsync(item => item.Id == message.Id);
        Assert.Equal(1, processed);
        Assert.Equal(NotificationStatus.Sent, saved.Status);
        Assert.Equal(2, saved.AttemptCount);
        Assert.Null(saved.LastError);
    }

    [Fact]
    public async Task ProcessPendingAsync_Should_Skip_Failed_Message_At_Max_Attempts()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var message = await SeedNotificationAsync(dbContext);
        message.MarkFailed("Failure 1.", DateTimeOffset.UtcNow);
        message.MarkFailed("Failure 2.", DateTimeOffset.UtcNow);
        message.MarkFailed("Failure 3.", DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync();
        var processor = CreateProcessor(dbContext, new FakeNotificationSender(NotificationSendResult.Success()));

        var processed = await processor.ProcessPendingAsync(CancellationToken.None);

        var saved = await dbContext.NotificationOutboxMessages.SingleAsync(item => item.Id == message.Id);
        Assert.Equal(0, processed);
        Assert.Equal(NotificationStatus.Failed, saved.Status);
        Assert.Equal(3, saved.AttemptCount);
        Assert.Equal("Failure 3.", saved.LastError);
    }

    [Fact]
    public async Task GetNotificationHistory_Should_Return_Filtered_History()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var message = await SeedNotificationAsync(dbContext);
        message.MarkSent(DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync();

        var result = await new GetNotificationHistoryHandler(dbContext)
            .Handle(new GetNotificationHistoryQuery(message.OrderId, "sent"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var history = result.Value!.Items;
        Assert.Single(history);
        Assert.Equal(1, result.Value.TotalCount);
        Assert.Equal(message.Id, history[0].NotificationId);
        Assert.Equal(NotificationStatus.Sent, history[0].Status);
        Assert.Equal("ORD-NOTIFY", history[0].OrderCode);
    }

    [Fact]
    public async Task GetNotificationHistory_Should_Return_Validation_For_Invalid_Status()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await new GetNotificationHistoryHandler(dbContext)
            .Handle(new GetNotificationHistoryQuery(null, "unknown"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.Validation, result.Status);
    }

    private static NotificationOutboxProcessor CreateProcessor(
        AppDbContext dbContext,
        INotificationSender sender)
    {
        return new NotificationOutboxProcessor(
            dbContext,
            sender,
            Options.Create(new NotificationOutboxOptions
            {
                BatchSize = 20,
                MaxAttempts = 3,
                PollIntervalSeconds = 30
            }),
            NullLogger<NotificationOutboxProcessor>.Instance);
    }

    private static async Task<NotificationOutboxMessage> SeedNotificationAsync(AppDbContext dbContext)
    {
        var now = DateTimeOffset.UtcNow;
        var customer = new Customer("Maria Santos", "09171234567", "maria@example.com", now);
        var service = new LaundryService(
            "Wash, Dry & Fold",
            null,
            "load",
            170m,
            supportsPickupAndDelivery: true,
            deliveryFee: 30m,
            now);
        var order = new LaundryOrder(
            "ORD-NOTIFY",
            "TRK-NOTIFY",
            customer,
            service,
            FulfillmentType.PickupAndDelivery,
            "Brgy. 10",
            DateOnly.FromDateTime(DateTime.UtcNow.Date),
            "6:00 AM - 8:00 AM",
            PaymentMethod.CashOnDelivery,
            1,
            null,
            now);
        var message = new NotificationOutboxMessage(
            order.Id,
            NotificationChannel.Sms,
            customer.MobileNumber,
            null,
            "Your laundry booking has been confirmed.",
            now);

        dbContext.Customers.Add(customer);
        dbContext.LaundryServices.Add(service);
        dbContext.LaundryOrders.Add(order);
        dbContext.NotificationOutboxMessages.Add(message);
        await dbContext.SaveChangesAsync();

        return message;
    }

    private sealed class FakeNotificationSender : INotificationSender
    {
        private readonly NotificationSendResult _result;

        public FakeNotificationSender(NotificationSendResult result)
        {
            _result = result;
        }

        public Task<NotificationSendResult> SendAsync(
            NotificationOutboxMessage message,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(_result);
        }
    }
}
