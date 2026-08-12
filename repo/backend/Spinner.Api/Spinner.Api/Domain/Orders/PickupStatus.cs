namespace Spinner.Api.Domain.Orders;

public enum PickupStatus
{
    Scheduled,
    PickedUp,
    FailedPickup,
    Rescheduled,
    Cancelled,

    /// <summary>
    /// The rider has left the shop for this pickup but has not collected it yet.
    /// </summary>
    /// <remarks>
    /// Appended rather than inserted so the stored values of the existing members do not
    /// shift. The app has always offered this step, but it had nowhere to record it and kept
    /// it in memory only, so the rider marked a job as on the way and the app forgot the
    /// moment the list refreshed.
    /// </remarks>
    OnRoute
}
