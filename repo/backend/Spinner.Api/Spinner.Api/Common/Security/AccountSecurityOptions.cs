namespace Spinner.Api.Common.Security;

public sealed class AccountSecurityOptions
{
    public const string SectionName = "AccountSecurity";

    public int VerificationCodeMinutes { get; init; } = 15;
    public int PasswordResetCodeMinutes { get; init; } = 15;
    public int ResendCooldownSeconds { get; init; } = 60;
    public int MaxCodeAttempts { get; init; } = 5;

    /// <summary>How long a staff invitation stays usable.</summary>
    public int InvitationDays { get; init; } = 7;

    /// <summary>Failed logins allowed before the account is locked out briefly.</summary>
    public int MaxFailedLoginAttempts { get; init; } = 8;

    /// <summary>How long that lockout lasts.</summary>
    public int LoginLockoutMinutes { get; init; } = 15;
}
