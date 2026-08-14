using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Users;

namespace Spinner.Api.Features.Staff.GetStaffAccounts;

public sealed record GetStaffAccountsQuery : IRequest<Result<IReadOnlyList<StaffAccountResponse>>>;

/// <summary>
/// One person who can sign in to the shop's app.
/// </summary>
/// <remarks>
/// Deliberately no password or token material, and no photo: this is the owner's list of who
/// has access, not a profile view.
/// </remarks>
public sealed record StaffAccountResponse(
    Guid Id,
    string FullName,
    string EmailAddress,
    string? MobileNumber,
    StaffRole Role,
    bool IsActive,
    bool IsEmailVerified,
    DateTimeOffset CreatedAt)
{
    public static StaffAccountResponse FromEntity(StaffUser user) =>
        new(
            user.Id,
            user.FullName,
            user.EmailAddress,
            user.MobileNumber,
            user.Role,
            user.IsActive,
            user.IsEmailVerified,
            user.CreatedAt);
}
