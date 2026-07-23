using Spinner.Api.Domain.Users;

namespace Spinner.Api.Features.Auth;

public sealed record AccountProfileResponse(
    Guid Id,
    string FullName,
    string EmailAddress,
    string? MobileNumber,
    StaffRole Role,
    bool IsActive)
{
    public static AccountProfileResponse FromEntity(StaffUser user) =>
        new(
            user.Id,
            user.FullName,
            user.EmailAddress,
            user.MobileNumber,
            user.Role,
            user.IsActive);
}
