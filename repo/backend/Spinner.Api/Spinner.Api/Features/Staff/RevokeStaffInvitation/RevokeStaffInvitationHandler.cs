using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Staff.RevokeStaffInvitation;

public sealed record RevokeStaffInvitationCommand(Guid InvitationId) : IRequest<Result>;

public sealed class RevokeStaffInvitationHandler
    : IRequestHandler<RevokeStaffInvitationCommand, Result>
{
    private readonly AppDbContext _dbContext;

    public RevokeStaffInvitationHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result> Handle(
        RevokeStaffInvitationCommand request,
        CancellationToken cancellationToken)
    {
        var invitation = await _dbContext.StaffInvitations
            .FirstOrDefaultAsync(item => item.Id == request.InvitationId, cancellationToken);

        if (invitation is null)
            return Result.NotFound("Invitation was not found.");

        if (invitation.AcceptedAt is not null)
        {
            return Result.Conflict(
                "This invitation has already been used. Deactivate the account instead.");
        }

        invitation.Revoke(DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result.NoContent();
    }
}
