namespace Spinner.Api.Common.Security;

public sealed class AccountSecurityOptions
{
    public const string SectionName = "AccountSecurity";

    public int VerificationCodeMinutes { get; init; } = 15;
    public int PasswordResetCodeMinutes { get; init; } = 15;
    public int ResendCooldownSeconds { get; init; } = 60;
    public int MaxCodeAttempts { get; init; } = 5;
}
