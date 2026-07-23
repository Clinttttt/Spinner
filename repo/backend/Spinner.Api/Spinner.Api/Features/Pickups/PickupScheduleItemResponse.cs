using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Pickups;

public sealed record PickupScheduleItemResponse(
    Guid OrderId,
    string OrderCode,
    string CustomerName,
    string ShortAddress,
    string ServiceName,
    DateOnly PreferredDate,
    string PreferredTimeWindow,
    OrderStatus OrderStatus,
    PickupStatus? PickupStatus)
{
    public static PickupScheduleItemResponse FromEntity(LaundryOrder order) => new(
        order.Id,
        order.OrderCode,
        order.Customer.FullName,
        ToShortAddress(order.Address),
        order.ServiceName,
        order.PreferredDate,
        order.PreferredTimeWindow,
        order.Status,
        order.PickupStatus);

    private static string ToShortAddress(string address)
    {
        var firstPart = address.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault();

        return string.IsNullOrWhiteSpace(firstPart) ? address : firstPart;
    }
}
