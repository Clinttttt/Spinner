namespace Spinner.Api.Domain.Users;

/// <summary>
/// A single-use permission to create one staff account.
/// </summary>
/// <remarks>
/// Registration used to be open to anyone who could reach the API, and every
/// account it created was an Owner. This is what closes that: after the first
/// account exists, a new account can only be created against an invitation the
/// owner issued for a specific email address.
///
/// The code is stored hashed, like every other account code, so a database read
/// does not hand out working invitations.
/// </remarks>
public sealed class StaffInvitation
{
    private StaffInvitation()
    {
    }

    public StaffInvitation(
        string emailAddress,
        StaffRole role,
        string codeHash,
        Guid invitedByUserId,
        DateTimeOffset expiresAt,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        EmailAddress = emailAddress.Trim().ToLowerInvariant();
        Role = role;
        CodeHash = codeHash;
        InvitedByUserId = invitedByUserId;
        ExpiresAt = expiresAt;
        CreatedAt = now;
    }

    public Guid Id { get; private set; }
    public string EmailAddress { get; private set; } = string.Empty;
    public StaffRole Role { get; private set; }
    public string CodeHash { get; private set; } = string.Empty;
    public Guid InvitedByUserId { get; private set; }
    public int FailedAttemptCount { get; private set; }
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? AcceptedAt { get; private set; }
    public Guid? AcceptedByUserId { get; private set; }
    public DateTimeOffset? RevokedAt { get; private set; }

    public bool IsPending(DateTimeOffset now) =>
        AcceptedAt is null && RevokedAt is null && ExpiresAt > now;

    /// <summary>
    /// Whether this invitation may still be attempted.
    /// </summary>
    /// <remarks>
    /// Capped attempts matter here as much as on a verification code: without it an
    /// invitation is a short code that can simply be guessed at leisure.
    /// </remarks>
    public bool CanAttempt(DateTimeOffset now, int maxAttempts) =>
        IsPending(now) && FailedAttemptCount < maxAttempts;

    public void RecordFailedAttempt() => FailedAttemptCount++;

    public void Accept(Guid acceptedByUserId, DateTimeOffset now)
    {
        if (AcceptedAt is not null) return;

        AcceptedAt = now;
        AcceptedByUserId = acceptedByUserId;
    }

    public void Revoke(DateTimeOffset now)
    {
        if (RevokedAt is null && AcceptedAt is null)
            RevokedAt = now;
    }
}
