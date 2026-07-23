using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Deliveries;

public sealed record DeliveryScheduleItemResponse(
    Guid OrderId,
    string OrderCode,
    string CustomerName,
    string ShortAddress,
    decimal AmountToCollect,
    PaymentStatus PaymentStatus,
    DeliveryStatus? DeliveryStatus,
    DateOnly PreferredDate,
    string PreferredTimeWindow)
{
    public static DeliveryScheduleItemResponse FromEntity(LaundryOrder order) => new(
        order.Id,
        order.OrderCode,
        order.Customer.FullName,
        ToShortAddress(order.Address),
        order.PaymentStatus == PaymentStatus.Paid ? 0m : order.EstimatedTotalAmount,
        order.PaymentStatus,
        order.DeliveryStatus,
        order.PreferredDate,
        order.PreferredTimeWindow);

    private static string ToShortAddress(string address)
    {
        var firstPart = address.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault();

        return string.IsNullOrWhiteSpace(firstPart) ? address : firstPart;
    }
}
