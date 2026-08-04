using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Users;

namespace Spinner.Api.Features.Staff.GetStaffInvitations;

public sealed record GetStaffInvitationsQuery : IRequest<Result<IReadOnlyList<StaffInvitationResponse>>>;

public sealed record StaffInvitationResponse(
    Guid InvitationId,
    string EmailAddress,
    StaffRole Role,
    DateTimeOffset ExpiresAt,
    DateTimeOffset CreatedAt);

public sealed class GetStaffInvitationsHandler
    : IRequestHandler<GetStaffInvitationsQuery, Result<IReadOnlyList<StaffInvitationResponse>>>
{
    private readonly AppDbContext _dbContext;

    public GetStaffInvitationsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<IReadOnlyList<StaffInvitationResponse>>> Handle(
        GetStaffInvitationsQuery request,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        // Only invitations that can still be used. An expired or spent one is
        // history, and showing it as if the owner could act on it would mislead.
        var invitations = await _dbContext.StaffInvitations
            .AsNoTracking()
            .Where(invitation =>
                invitation.AcceptedAt == null &&
                invitation.RevokedAt == null &&
                invitation.ExpiresAt > now)
            .OrderByDescending(invitation => invitation.CreatedAt)
            .Select(invitation => new StaffInvitationResponse(
                invitation.Id,
                invitation.EmailAddress,
                invitation.Role,
                invitation.ExpiresAt,
                invitation.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<StaffInvitationResponse>>.Success(invitations);
    }
}
