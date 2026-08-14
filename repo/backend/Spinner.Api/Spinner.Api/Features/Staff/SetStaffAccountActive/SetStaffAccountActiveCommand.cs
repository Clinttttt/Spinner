using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Staff.GetStaffAccounts;

namespace Spinner.Api.Features.Staff.SetStaffAccountActive;

/// <summary>
/// Withdraws or restores one person's access to the shop's app.
/// </summary>
/// <param name="ActingUserId">
/// Who is making the change. Needed because the one thing an owner must not be able to do is
/// deactivate themselves, which would lock them out of the app that holds the only way back in.
/// </param>
public sealed record SetStaffAccountActiveCommand(
    Guid ActingUserId,
    Guid TargetUserId,
    bool IsActive) : IRequest<Result<StaffAccountResponse>>;
