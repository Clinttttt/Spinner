namespace Spinner.Api.Domain.Orders;

public enum PickupStatus
{
    Scheduled,
    PickedUp,
    FailedPickup,
    Rescheduled,
    Cancelled
}
