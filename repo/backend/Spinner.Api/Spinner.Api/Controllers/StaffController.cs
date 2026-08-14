using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Staff.GetStaffAccounts;
using Spinner.Api.Features.Staff.GetStaffInvitations;
using Spinner.Api.Features.Staff.InviteStaff;
using Spinner.Api.Features.Staff.RevokeStaffInvitation;
using Spinner.Api.Features.Staff.SetStaffAccountActive;

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

    /// <summary>
    /// Everyone who can sign in to the shop's app.
    /// </summary>
    /// <remarks>
    /// The owner could previously see pending invitations but not the accounts they became, so
    /// there was no way to review who actually had access.
    /// </remarks>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StaffAccountResponse>>> ListAccounts(
        CancellationToken ct)
    {
        var result = await Sender.Send(new GetStaffAccountsQuery(), ct);
        return HandleResponse(result);
    }

    /// <summary>Withdraws a staff member's access, keeping their history intact.</summary>
    [HttpPost("{staffUserId:guid}/deactivate")]
    public async Task<ActionResult<StaffAccountResponse>> Deactivate(
        Guid staffUserId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        var result = await Sender.Send(
            new SetStaffAccountActiveCommand(userId, staffUserId, IsActive: false),
            ct);

        return HandleResponse(result);
    }

    /// <summary>Restores access to a previously deactivated account.</summary>
    [HttpPost("{staffUserId:guid}/activate")]
    public async Task<ActionResult<StaffAccountResponse>> Activate(
        Guid staffUserId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        var result = await Sender.Send(
            new SetStaffAccountActiveCommand(userId, staffUserId, IsActive: true),
            ct);

        return HandleResponse(result);
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
