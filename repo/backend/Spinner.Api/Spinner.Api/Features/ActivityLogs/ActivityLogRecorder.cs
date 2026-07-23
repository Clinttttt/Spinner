using Spinner.Api.Database;
using Spinner.Api.Domain.ActivityLogs;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.ActivityLogs;

public static class ActivityLogRecorder
{
    public static void RecordOrderActivity(
        AppDbContext dbContext,
        LaundryOrder order,
        string action,
        string description,
        DateTimeOffset now,
        string actor = "staff")
    {
        dbContext.ActivityLogEntries.Add(new ActivityLogEntry(
            actor,
            action,
            "LaundryOrder",
            order.Id,
            description,
            now));
    }
}
