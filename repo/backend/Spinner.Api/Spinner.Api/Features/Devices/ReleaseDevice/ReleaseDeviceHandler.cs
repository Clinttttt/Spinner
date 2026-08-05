using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Devices.ReleaseDevice;

public sealed record ReleaseDeviceCommand(Guid UserId, string RegistrationToken)
    : IRequest<Result>;

/// <summary>
/// Stops a phone receiving the shop's notifications.
/// </summary>
/// <remarks>
/// Called on sign-out. Without it, a staff member who signs out — or hands the phone
/// back — keeps getting told about every booking the shop takes, which is both a
/// nuisance and a small leak of how busy the business is.
/// </remarks>
public sealed class ReleaseDeviceHandler : IRequestHandler<ReleaseDeviceCommand, Result>
{
    private readonly AppDbContext _dbContext;

    public ReleaseDeviceHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result> Handle(
        ReleaseDeviceCommand request,
        CancellationToken cancellationToken)
    {
        var token = request.RegistrationToken?.Trim();

        if (string.IsNullOrWhiteSpace(token))
            return Result.NoContent();

        var device = await _dbContext.StaffDevices
            .FirstOrDefaultAsync(
                item => item.RegistrationToken == token && item.UserId == request.UserId,
                cancellationToken);

        // Silent when there is nothing to release. Signing out should not report an
        // error because the phone had not registered, or had already been released.
        if (device is null)
            return Result.NoContent();

        device.Retire(DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result.NoContent();
    }
}
