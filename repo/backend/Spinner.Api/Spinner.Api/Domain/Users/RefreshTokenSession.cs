namespace Spinner.Api.Domain.Users;

public sealed class RefreshTokenSession
{
    private RefreshTokenSession()
    {
    }

    public RefreshTokenSession(
        Guid userId,
        string tokenHash,
        Guid familyId,
        DateTimeOffset expiresAt,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        TokenHash = tokenHash;
        FamilyId = familyId;
        ExpiresAt = expiresAt;
        CreatedAt = now;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public Guid FamilyId { get; private set; }
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? RevokedAt { get; private set; }
    public Guid? ReplacedByTokenId { get; private set; }
    public StaffUser User { get; private set; } = null!;

    public bool IsActive(DateTimeOffset now) =>
        RevokedAt is null && ExpiresAt > now;

    public void Revoke(DateTimeOffset now, Guid? replacedByTokenId = null)
    {
        if (RevokedAt is not null)
            return;

        RevokedAt = now;
        ReplacedByTokenId = replacedByTokenId;
    }
}
