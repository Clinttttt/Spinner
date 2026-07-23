namespace Spinner.Api.Domain.ActivityLogs;

public sealed class ActivityLogEntry
{
    private ActivityLogEntry()
    {
    }

    public ActivityLogEntry(
        string actor,
        string action,
        string entityType,
        Guid? entityId,
        string description,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        Actor = actor.Trim();
        Action = action.Trim();
        EntityType = entityType.Trim();
        EntityId = entityId;
        Description = description.Trim();
        CreatedAt = now;
    }

    public Guid Id { get; private set; }
    public string Actor { get; private set; } = string.Empty;
    public string Action { get; private set; } = string.Empty;
    public string EntityType { get; private set; } = string.Empty;
    public Guid? EntityId { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; private set; }
}
