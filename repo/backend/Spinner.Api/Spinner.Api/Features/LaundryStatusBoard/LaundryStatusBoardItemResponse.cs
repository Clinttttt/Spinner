using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.LaundryStatusBoard;

public sealed record LaundryStatusBoardItemResponse(
    Guid OrderId,
    string OrderCode,
    string CustomerName,
    string ServiceName,
    int LoadCount,
    FulfillmentType FulfillmentType,
    PaymentStatus PaymentStatus,
    OrderStatus Status,
    string BoardStatus,
    decimal EstimatedTotalAmount,
    DateTimeOffset UpdatedAt)
{
    public static LaundryStatusBoardItemResponse FromEntity(LaundryOrder order) => new(
        order.Id,
        order.OrderCode,
        order.ContactName,
        order.ServiceName,
        order.LoadCount,
        order.FulfillmentType,
        order.PaymentStatus,
        order.Status,
        ToBoardStatus(order.Status),
        order.EstimatedTotalAmount,
        order.UpdatedAt);

    private static string ToBoardStatus(OrderStatus status) => status switch
    {
        OrderStatus.PickedUp => "Received",
        OrderStatus.BeingProcessed => "Being Processed",
        OrderStatus.ReadyForDelivery => "Ready",
        _ => status.ToString()
    };
}
