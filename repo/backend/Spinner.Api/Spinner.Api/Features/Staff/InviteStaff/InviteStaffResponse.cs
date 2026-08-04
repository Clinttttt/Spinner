using Spinner.Api.Domain.Users;

namespace Spinner.Api.Features.Staff.InviteStaff;

/// <remarks>
/// The code is returned once, here, and never stored in a readable form. The owner
/// is the one who has to pass it to the person being invited, and in a shop that is
/// realistically done in person or over chat, so it has to be visible at least once.
/// </remarks>
public sealed record InviteStaffResponse(
    Guid InvitationId,
    string EmailAddress,
    StaffRole Role,
    string InvitationCode,
    DateTimeOffset ExpiresAt);
