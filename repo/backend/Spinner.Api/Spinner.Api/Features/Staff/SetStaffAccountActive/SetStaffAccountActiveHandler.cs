using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Staff.GetStaffAccounts;

namespace Spinner.Api.Features.Staff.SetStaffAccountActive;

/// <summary>
/// Turns one staff account's access on or off.
/// </summary>
/// <remarks>
/// Until now the only thing an owner could withdraw was an unaccepted invitation, so a member
/// of staff who left kept working access indefinitely. That is what this closes.
///
/// Two refusals exist purely to stop the shop locking itself out, and both matter more than
/// the feature itself: an owner cannot deactivate their own account, and the last active owner
/// cannot be deactivated by anyone. Without the second, two owners could disable each other
/// and nobody could ever manage staff, prices or settings again.
/// </remarks>
public sealed class SetStaffAccountActiveHandler
    : IRequestHandler<SetStaffAccountActiveCommand, Result<StaffAccountResponse>>
{
    private readonly AppDbContext _dbContext;

    public SetStaffAccountActiveHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<StaffAccountResponse>> Handle(
        SetStaffAccountActiveCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _dbContext.StaffUsers.FirstOrDefaultAsync(
            candidate => candidate.Id == request.TargetUserId,
            cancellationToken);

        if (user is null)
            return Result<StaffAccountResponse>.NotFound("That staff account was not found.");

        if (!request.IsActive)
        {
            if (request.TargetUserId == request.ActingUserId)
            {
                return Result<StaffAccountResponse>.Validation(
                    "You cannot deactivate your own account.");
            }

            if (user.Role == StaffRole.Owner)
            {
                var otherActiveOwners = await _dbContext.StaffUsers.CountAsync(
                    candidate =>
                        candidate.Id != user.Id &&
                        candidate.Role == StaffRole.Owner &&
                        candidate.IsActive,
                    cancellationToken);

                if (otherActiveOwners == 0)
                {
                    return Result<StaffAccountResponse>.Validation(
                        "This is the only active owner account. Another owner must be active first.");
                }
            }
        }

        var now = DateTimeOffset.UtcNow;

        if (request.IsActive)
        {
            user.Activate(now);
        }
        else
        {
            user.Deactivate(now);

            // Access has to stop now, not whenever the access token happens to expire. Every
            // refresh session is revoked so the app cannot quietly renew itself.
            var sessions = await _dbContext.RefreshTokenSessions
                .Where(session => session.UserId == user.Id && session.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var session in sessions)
                session.Revoke(now);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<StaffAccountResponse>.Success(StaffAccountResponse.FromEntity(user));
    }
}
