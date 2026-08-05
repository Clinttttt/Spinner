namespace Spinner.Api.Domain.Users;

/// <summary>
/// Recorded so the owner can tell their devices apart when reviewing them, and so a
/// platform-specific delivery problem can be traced later.
/// </summary>
public enum DevicePlatform
{
    Android,
    Ios,
    Web
}
