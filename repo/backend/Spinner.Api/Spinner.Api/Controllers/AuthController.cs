using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Spinner.Api.Common.Security;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Auth;
using Spinner.Api.Features.Auth.Login;
using Spinner.Api.Features.Auth.ChangePassword;
using Spinner.Api.Features.Auth.GetCurrentAccount;
using Spinner.Api.Features.Auth.RefreshSession;
using Spinner.Api.Features.Auth.Register;
using Spinner.Api.Features.Auth.RevokeAllSessions;
using Spinner.Api.Features.Auth.RevokeSession;
using Spinner.Api.Features.Auth.ResendVerification;
using Spinner.Api.Features.Auth.ForgotPassword;
using Spinner.Api.Features.Auth.ResetPassword;
using Spinner.Api.Features.Auth.UpdateAccountProfile;
using Spinner.Api.Features.Auth.VerifyEmail;

namespace Spinner.Api.Controllers;

[Route("api/auth")]
public sealed class AuthController : ApiControllerBase
{
    public AuthController(ISender sender)
        : base(sender)
    {
    }

    [EnableRateLimiting(RateLimitPolicies.Authentication)]
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(new LoginCommand(request.Login, request.Password), ct);
        return HandleResponse(result);
    }

    [EnableRateLimiting(RateLimitPolicies.AccountCodes)]
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<RegisterResponse>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(new RegisterCommand(
            request.FullName,
            request.EmailAddress,
            request.MobileNumber,
            request.Password,
            request.ConfirmPassword), ct);
        return HandleResponse(result);
    }

    [EnableRateLimiting(RateLimitPolicies.Authentication)]
    [HttpPost("verify-email")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> VerifyEmail(
        [FromBody] VerifyEmailRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new VerifyEmailCommand(request.EmailAddress, request.Code),
            ct);
        return HandleResponse(result);
    }

    [EnableRateLimiting(RateLimitPolicies.AccountCodes)]
    [HttpPost("resend-verification")]
    [AllowAnonymous]
    public async Task<ActionResult<AccountCodeDeliveryResponse>> ResendVerification(
        [FromBody] ResendVerificationRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new ResendVerificationCommand(request.EmailAddress),
            ct);
        return HandleResponse(result);
    }

    [EnableRateLimiting(RateLimitPolicies.AccountCodes)]
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult<AccountCodeDeliveryResponse>> ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new ForgotPasswordCommand(request.Login),
            ct);
        return HandleResponse(result);
    }

    [EnableRateLimiting(RateLimitPolicies.Authentication)]
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<ActionResult> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(new ResetPasswordCommand(
            request.Login,
            request.Code,
            request.NewPassword,
            request.ConfirmPassword), ct);
        return HandleResponse(result);
    }

    [EnableRateLimiting(RateLimitPolicies.Authentication)]
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
