namespace Spinner.Api.Domain.Orders;

public enum OrderStatus
{
    BookingReceived,
    Confirmed,
    PickedUp,
    BeingProcessed,
    ReadyForDelivery,
    Completed,
    Rejected
}
