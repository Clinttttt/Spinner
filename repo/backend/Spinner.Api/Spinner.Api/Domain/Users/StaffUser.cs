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
    public string PasswordHash { get; private set; } = string.Empty;
    public StaffRole Role { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsEmailVerified { get; private set; }
    public DateTimeOffset? EmailVerifiedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

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
