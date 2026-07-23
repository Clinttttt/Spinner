using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Auth;
using Spinner.Api.Features.Auth.Login;
using Spinner.Api.Features.Auth.ChangePassword;
using Spinner.Api.Features.Auth.GetCurrentAccount;
using Spinner.Api.Features.Auth.RefreshSession;
using Spinner.Api.Features.Auth.RevokeAllSessions;
using Spinner.Api.Features.Auth.RevokeSession;
using Spinner.Api.Features.Auth.UpdateAccountProfile;

namespace Spinner.Api.Controllers;

[Route("api/auth")]
public sealed class AuthController : ApiControllerBase
{
    public AuthController(ISender sender)
        : base(sender)
    {
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(new LoginCommand(request.Login, request.Password), ct);
        return HandleResponse(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Refresh(
        [FromBody] RefreshSessionRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new RefreshSessionCommand(request.RefreshToken),
            ct);
        return HandleResponse(result);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<ActionResult> Logout(
        [FromBody] RevokeSessionRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new RevokeSessionCommand(request.RefreshToken),
            ct);
        return HandleResponse(result);
    }

    [HttpPost("logout-all")]
    [Authorize]
    public async Task<ActionResult> LogoutAll(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return HandleResponse(Result.Unauthorized("The access token is invalid."));

        var result = await Sender.Send(
            new RevokeAllSessionsCommand(userId),
            ct);
        return HandleResponse(result);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<AccountProfileResponse>> GetCurrentAccount(
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return HandleResponse(Result<AccountProfileResponse>.Unauthorized("The access token is invalid."));

        var result = await Sender.Send(new GetCurrentAccountQuery(userId), ct);
        return HandleResponse(result);
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<AccountProfileResponse>> UpdateProfile(
        [FromBody] UpdateAccountProfileRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return HandleResponse(Result<AccountProfileResponse>.Unauthorized("The access token is invalid."));

        var result = await Sender.Send(new UpdateAccountProfileCommand(
            userId,
            request.FullName,
            request.EmailAddress,
            request.MobileNumber), ct);
        return HandleResponse(result);
    }

    [HttpPut("password")]
    [Authorize]
    public async Task<ActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return HandleResponse(Result.Unauthorized("The access token is invalid."));

        var result = await Sender.Send(new ChangePasswordCommand(
            userId,
            request.CurrentPassword,
            request.NewPassword), ct);
        return HandleResponse(result);
    }
}
