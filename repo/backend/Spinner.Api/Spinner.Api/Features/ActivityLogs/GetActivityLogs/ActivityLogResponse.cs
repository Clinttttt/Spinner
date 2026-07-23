namespace Spinner.Api.Features.ActivityLogs.GetActivityLogs;

public sealed record ActivityLogResponse(
    Guid Id,
    string Actor,
    string Action,
    string EntityType,
    Guid? EntityId,
    string Description,
    DateTimeOffset CreatedAt);
