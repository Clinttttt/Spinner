using Spinner.Api.Domain.ActivityLogs;
using Spinner.Api.Features.ActivityLogs.GetActivityLogs;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.ActivityLogs;

public sealed class ActivityLogHandlerTests
{
    [Fact]
    public async Task GetActivityLogs_Should_Return_Filtered_Activity()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var orderId = Guid.NewGuid();
        dbContext.ActivityLogEntries.Add(new ActivityLogEntry(
            "staff",
            "BookingConfirmed",
            "LaundryOrder",
            orderId,
            "Booking was confirmed.",
            DateTimeOffset.UtcNow));
        dbContext.ActivityLogEntries.Add(new ActivityLogEntry(
            "system",
            "OnlinePaymentConfirmed",
            "LaundryOrder",
            Guid.NewGuid(),
            "Online payment was confirmed.",
            DateTimeOffset.UtcNow));
        await dbContext.SaveChangesAsync();

        var result = await new GetActivityLogsHandler(dbContext)
            .Handle(new GetActivityLogsQuery(orderId, "BookingConfirmed"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var logs = result.Value!.Items;
        Assert.Single(logs);
        Assert.Equal(1, result.Value.TotalCount);
        Assert.Equal("staff", logs[0].Actor);
        Assert.Equal("BookingConfirmed", logs[0].Action);
        Assert.Equal(orderId, logs[0].EntityId);
    }
}
