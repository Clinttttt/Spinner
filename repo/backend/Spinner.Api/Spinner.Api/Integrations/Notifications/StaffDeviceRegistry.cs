using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;

namespace Spinner.Api.Integrations.Notifications;

/// <summary>
/// Lets the sender retire a device Firebase has rejected.
/// </summary>
/// <remarks>
/// An interface so the sender can be tested without a database, and so the integration
/// does not reach into the data layer directly.
/// </remarks>
public interface IStaffDeviceRegistry
{
    Task RetireAsync(string registrationToken, CancellationToken cancellationToken);
}

public sealed class StaffDeviceRegistry : IStaffDeviceRegistry
{
    private readonly AppDbContext _dbContext;

    public StaffDeviceRegistry(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task RetireAsync(string registrationToken, CancellationToken cancellationToken)
    {
        var device = await _dbContext.StaffDevices
            .FirstOrDefaultAsync(
                item => item.RegistrationToken == registrationToken,
                cancellationToken);

        if (device is null) return;

        device.Retire(DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
