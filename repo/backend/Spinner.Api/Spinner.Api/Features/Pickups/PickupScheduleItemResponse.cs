using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Pickups;

/// <summary>
/// One pickup job on the owner's schedule.
/// </summary>
/// <remarks>
/// The payload intentionally carries everything the pickup list renders
/// (contact, payment, services, and the stored map pin) so the mobile app does
/// not have to issue one extra order request per pickup.
/// </remarks>
public sealed record PickupScheduleItemResponse(
    Guid OrderId,
    string OrderCode,
    string CustomerName,
    string? MobileNumber,
    string ShortAddress,
    string Address,
    string ServiceName,
    IReadOnlyList<string> Services,
    DateOnly PreferredDate,
    string PreferredTimeWindow,
    Orders.PickupLocationResponse? PickupLocation,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    OrderStatus OrderStatus,
    PickupStatus? PickupStatus,
    bool AwaitingConfirmation,
    DateTimeOffset? PickupUpdatedAt,
    DateTimeOffset UpdatedAt)
{
    public static PickupScheduleItemResponse FromEntity(LaundryOrder order) => new(
        order.Id,
        order.OrderCode,
        order.Customer.FullName,
        order.Customer.MobileNumber,
        ToShortAddress(order.Address),
        order.Address,
        order.ServiceName,
        order.ServiceItems.Count > 0
            ? order.ServiceItems.Select(item => item.ServiceName).ToList()
            : [order.ServiceName],
        order.PreferredDate,
        order.PreferredTimeWindow,
        Orders.PickupLocationResponse.FromEntity(order.PickupLocation),
        order.PaymentMethod,
        order.PaymentStatus,
        order.Status,
        order.PickupStatus,
        order.Status == OrderStatus.BookingReceived,
        order.PickupUpdatedAt,
        order.UpdatedAt);

    private static string ToShortAddress(string address)
    {
        var firstPart = address.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault();

        return string.IsNullOrWhiteSpace(firstPart) ? address : firstPart;
    }
}
