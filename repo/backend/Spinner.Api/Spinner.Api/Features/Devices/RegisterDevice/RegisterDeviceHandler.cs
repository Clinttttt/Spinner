using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Users;

namespace Spinner.Api.Features.Devices.RegisterDevice;

public sealed record RegisterDeviceCommand(
    Guid UserId,
    string RegistrationToken,
    DevicePlatform Platform,
    string? DeviceName) : IRequest<Result>;

/// <summary>
/// Records the phone that should be told when the shop needs attention.
/// </summary>
/// <remarks>
/// Called after every sign-in rather than once, because the token a device is given can
/// be rotated by the operating system at any time and a stale one silently stops
/// receiving anything.
/// </remarks>
public sealed class RegisterDeviceHandler : IRequestHandler<RegisterDeviceCommand, Result>
{
    private readonly AppDbContext _dbContext;

    public RegisterDeviceHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result> Handle(
        RegisterDeviceCommand request,
        CancellationToken cancellationToken)
    {
        var token = request.RegistrationToken?.Trim();

        if (string.IsNullOrWhiteSpace(token))
            return Result.Validation("A device registration token is required.");

        if (token.Length > 512)
            return Result.Validation("That device registration token is not valid.");

        var now = DateTimeOffset.UtcNow;

        var existing = await _dbContext.StaffDevices
            .FirstOrDefaultAsync(device => device.RegistrationToken == token, cancellationToken);

        if (existing is null)
        {
            _dbContext.StaffDevices.Add(new StaffDevice(
                request.UserId,
                token,
                request.Platform,
                request.DeviceName,
                now));
        }
        else
        {
            // The token belongs to the handset, so it moves to whoever is signed in now.
            // On a shared counter phone this is the normal case, not an edge one.
            existing.ReassignTo(request.UserId, request.DeviceName, now);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result.NoContent();
    }
}
