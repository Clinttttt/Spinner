namespace Spinner.Api.Domain.Orders;

public enum DeliveryStatus
{
    Ready,
    OutForDelivery,
    Delivered,
    FailedDelivery,
    Rescheduled
}
