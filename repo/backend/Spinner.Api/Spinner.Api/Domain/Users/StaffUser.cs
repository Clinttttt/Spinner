namespace Spinner.Api.Domain.Users;

public sealed class StaffUser
{
    private StaffUser()
    {
    }

    public StaffUser(
        string fullName,
        string emailAddress,
        string? mobileNumber,
        string passwordHash,
        StaffRole role,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        FullName = fullName.Trim();
        EmailAddress = emailAddress.Trim().ToLowerInvariant();
        MobileNumber = string.IsNullOrWhiteSpace(mobileNumber) ? null : mobileNumber.Trim();
        PasswordHash = passwordHash;
        Role = role;
        IsActive = true;
        IsEmailVerified = false;
        CreatedAt = now;
        UpdatedAt = now;
    }

    public Guid Id { get; private set; }
    public string FullName { get; private set; } = string.Empty;
    public string EmailAddress { get; private set; } = string.Empty;
    public string? MobileNumber { get; private set; }

    /// <summary>
    /// Address of this person's profile picture, or null when they have not set one.
    /// </summary>
    /// <remarks>
    /// A URL rather than the image itself, because the bytes live in object storage and are
    /// served by the media endpoint. Null is a normal, permanent state: the app draws the
    /// person's initials instead, which is why nothing here requires a photo to exist.
    /// </remarks>
    public string? PhotoUrl { get; private set; }
    public string PasswordHash { get; private set; } = string.Empty;
    public StaffRole Role { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsEmailVerified { get; private set; }
    public DateTimeOffset? EmailVerifiedAt { get; private set; }
    public int FailedLoginCount { get; private set; }
    public DateTimeOffset? LockedOutUntil { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public bool IsLockedOut(DateTimeOffset now) =>
        LockedOutUntil is not null && LockedOutUntil > now;

    /// <summary>
    /// Records a failed sign-in and locks the account once too many pile up.
    /// </summary>
    /// <remarks>
    /// Rate limiting alone only slows a single client address down. This makes a
    /// distributed guessing attempt against one account expensive as well, and it is
    /// deliberately a temporary lockout rather than a permanent one so the shop
    /// cannot be locked out of its own account by someone else's guessing.
    /// </remarks>
    public void RecordFailedLogin(DateTimeOffset now, int maxAttempts, int lockoutMinutes)
    {
        FailedLoginCount++;
        UpdatedAt = now;

        if (FailedLoginCount < maxAttempts) return;

        LockedOutUntil = now.AddMinutes(lockoutMinutes);
        FailedLoginCount = 0;
    }

    public void RecordSuccessfulLogin(DateTimeOffset now)
    {
        if (FailedLoginCount == 0 && LockedOutUntil is null) return;

        FailedLoginCount = 0;
        LockedOutUntil = null;
        UpdatedAt = now;
    }

    public void UpdateProfile(
        string fullName,
        string emailAddress,
        string? mobileNumber,
        DateTimeOffset now)
    {
        var normalizedEmail = emailAddress.Trim().ToLowerInvariant();
        if (!string.Equals(EmailAddress, normalizedEmail, StringComparison.Ordinal))
        {
            IsEmailVerified = false;
            EmailVerifiedAt = null;
        }

        FullName = fullName.Trim();
        EmailAddress = normalizedEmail;
        MobileNumber = string.IsNullOrWhiteSpace(mobileNumber) ? null : mobileNumber.Trim();
        UpdatedAt = now;
    }

    /// <summary>
    /// Sets or clears this person's profile picture.
    /// </summary>
    /// <remarks>
    /// Separate from <see cref="UpdateProfile"/> because a picture is not a detail that has to
    /// be re-verified: changing an email address invalidates its verification, and folding the
    /// photo into that method would mean choosing a new picture could quietly do the same.
    /// </remarks>
    public void SetPhotoUrl(string? photoUrl, DateTimeOffset now)
    {
        PhotoUrl = string.IsNullOrWhiteSpace(photoUrl) ? null : photoUrl.Trim();
        UpdatedAt = now;
    }

    public void ChangePassword(string passwordHash, DateTimeOffset now)
    {
        PasswordHash = passwordHash;
        UpdatedAt = now;
    }

    public void VerifyEmail(DateTimeOffset now)
    {
        IsEmailVerified = true;
        EmailVerifiedAt = now;
        UpdatedAt = now;
    }

    public void MarkEmailVerifiedForBootstrap(DateTimeOffset now) =>
        VerifyEmail(now);
}
