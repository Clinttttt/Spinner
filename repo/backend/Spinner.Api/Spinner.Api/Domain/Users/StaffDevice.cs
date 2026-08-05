namespace Spinner.Api.Domain.Users;

/// <summary>
/// A phone that should be told when something needs the shop's attention.
/// </summary>
/// <remarks>
/// Held per device rather than per account because one person may use two phones and,
/// more importantly in a laundromat, one phone is often shared between staff. The
/// registration token is what Firebase Cloud Messaging addresses, and it is issued by
/// the device rather than chosen by us, so it is the natural identity.
/// </remarks>
public sealed class StaffDevice
{
    private StaffDevice()
    {
    }

    public StaffDevice(
        Guid userId,
        string registrationToken,
        DevicePlatform platform,
        string? deviceName,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        RegistrationToken = registrationToken.Trim();
        Platform = platform;
        DeviceName = string.IsNullOrWhiteSpace(deviceName) ? null : deviceName.Trim();
        IsActive = true;
        CreatedAt = now;
        LastSeenAt = now;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public StaffUser User { get; private set; } = null!;

    /// <summary>The token Firebase Cloud Messaging delivers to.</summary>
    public string RegistrationToken { get; private set; } = string.Empty;

    public DevicePlatform Platform { get; private set; }
    public string? DeviceName { get; private set; }
    public bool IsActive { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset LastSeenAt { get; private set; }
    public DateTimeOffset? RetiredAt { get; private set; }

    /// <summary>
    /// Points an existing token at whoever is signed in now.
    /// </summary>
    /// <remarks>
    /// A token belongs to the phone, not the person. When a shared counter phone is
    /// signed into by someone else, the same token arrives again and must move across
    /// rather than be stored twice — otherwise the shop's alerts keep going to a
    /// device under the name of whoever set it up first, and one booking produces two
    /// notifications on the same handset.
    /// </remarks>
    public void ReassignTo(Guid userId, string? deviceName, DateTimeOffset now)
    {
        UserId = userId;
        DeviceName = string.IsNullOrWhiteSpace(deviceName) ? DeviceName : deviceName.Trim();
        IsActive = true;
        RetiredAt = null;
        LastSeenAt = now;
    }

    public void MarkSeen(DateTimeOffset now) => LastSeenAt = now;

    /// <summary>
    /// Stops this device receiving anything further.
    /// </summary>
    /// <remarks>
    /// Used both when someone signs out and when Firebase reports the token as no
    /// longer valid. Retired rather than deleted so a phone that comes back keeps its
    /// history, and so a token that Firebase rejected is not requested again on the
    /// next booking.
    /// </remarks>
    public void Retire(DateTimeOffset now)
    {
        if (!IsActive) return;

        IsActive = false;
        RetiredAt = now;
    }
}
