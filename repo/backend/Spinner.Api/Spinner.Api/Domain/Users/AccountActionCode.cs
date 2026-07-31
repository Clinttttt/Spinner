namespace Spinner.Api.Domain.Users;

public sealed class AccountActionCode
{
    private AccountActionCode()
    {
    }

    public AccountActionCode(
        Guid userId,
        AccountActionPurpose purpose,
        string codeHash,
        DateTimeOffset expiresAt,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        Purpose = purpose;
        CodeHash = codeHash;
        ExpiresAt = expiresAt;
        CreatedAt = now;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public StaffUser User { get; private set; } = null!;
    public AccountActionPurpose Purpose { get; private set; }
    public string CodeHash { get; private set; } = string.Empty;
    public int FailedAttemptCount { get; private set; }
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? ConsumedAt { get; private set; }

    public bool CanAttempt(DateTimeOffset now, int maxAttempts) =>
        ConsumedAt is null &&
        ExpiresAt > now &&
        FailedAttemptCount < maxAttempts;

    public void RecordFailedAttempt() => FailedAttemptCount++;

    public void Consume(DateTimeOffset now)
    {
        if (ConsumedAt is null)
            ConsumedAt = now;
    }
}
