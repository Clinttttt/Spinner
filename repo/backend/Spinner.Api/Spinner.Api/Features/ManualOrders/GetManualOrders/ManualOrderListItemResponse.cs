using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.ManualOrders.GetManualOrders;

public sealed record ManualOrderListItemResponse(
    Guid OrderId,
    string OrderCode,
    string CustomerName,
    string MobileNumber,
    FulfillmentType Method,
    string Address,
    DateOnly ScheduledDate,
    string ScheduledTime,
    OrderStatus Status,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    IReadOnlyList<string> Services,
    decimal TotalAmount,
    DateTimeOffset CreatedAt);
