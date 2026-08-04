using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Staff.GetStaffInvitations;
using Spinner.Api.Features.Staff.InviteStaff;
using Spinner.Api.Features.Staff.RevokeStaffInvitation;

namespace Spinner.Api.Controllers;

/// <summary>
/// Staff account administration. Owner only, since this is what decides who can
/// get into the shop's books at all.
/// </summary>
[Route("api/staff")]
[Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
public sealed class StaffController : ApiControllerBase
{
    public StaffController(ISender sender)
        : base(sender)
    {
    }

    [HttpPost("invitations")]
    public async Task<ActionResult<InviteStaffResponse>> Invite(
        [FromBody] InviteStaffRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        var result = await Sender.Send(
            new InviteStaffCommand(userId, request.EmailAddress, request.Role),
            ct);

        return HandleResponse(result);
    }

    [HttpGet("invitations")]
    public async Task<ActionResult<IReadOnlyList<StaffInvitationResponse>>> List(
        CancellationToken ct)
    {
        var result = await Sender.Send(new GetStaffInvitationsQuery(), ct);
        return HandleResponse(result);
    }

    [HttpPost("invitations/{invitationId:guid}/revoke")]
    public async Task<ActionResult> Revoke(Guid invitationId, CancellationToken ct)
    {
        var result = await Sender.Send(new RevokeStaffInvitationCommand(invitationId), ct);
        return HandleResponse(result);
    }
}

public sealed record InviteStaffRequest(string EmailAddress, StaffRole Role = StaffRole.Staff);
