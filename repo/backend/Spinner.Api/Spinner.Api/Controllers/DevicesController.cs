using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Security;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Devices.RegisterDevice;
using Spinner.Api.Features.Devices.ReleaseDevice;

namespace Spinner.Api.Controllers;

/// <summary>
/// The phones that should be told when the shop needs attention.
/// </summary>
/// <remarks>
/// Open to any signed-in member of the shop rather than the owner alone: staff need to
/// hear about a booking as much as the owner does, and a device can only ever be
/// registered against the account making the call.
/// </remarks>
[Route("api/devices")]
[Authorize(Policy = AuthorizationPolicies.StaffOrOwner)]
public sealed class DevicesController : ApiControllerBase
{
    public DevicesController(ISender sender)
        : base(sender)
    {
    }

    [HttpPost("register")]
    public async Task<ActionResult> Register(
        [FromBody] RegisterDeviceRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        var result = await Sender.Send(
            new RegisterDeviceCommand(
                userId,
                request.RegistrationToken,
                request.Platform,
                request.DeviceName),
            ct);

        return HandleResponse(result);
    }

    [HttpPost("release")]
    public async Task<ActionResult> Release(
        [FromBody] ReleaseDeviceRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        var result = await Sender.Send(
            new ReleaseDeviceCommand(userId, request.RegistrationToken),
            ct);

        return HandleResponse(result);
    }
}

public sealed record RegisterDeviceRequest(
    string RegistrationToken,
    DevicePlatform Platform = DevicePlatform.Android,
    string? DeviceName = null);

public sealed record ReleaseDeviceRequest(string RegistrationToken);
