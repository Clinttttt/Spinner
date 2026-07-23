using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Reports.GetOrderHistory;

public sealed record OrderHistoryItemResponse(
    Guid OrderId,
    string OrderCode,
    OrderSource Source,
    string CustomerName,
    string MobileNumber,
    string ServiceName,
    DateOnly PreferredDate,
    string PreferredTimeWindow,
    FulfillmentType FulfillmentType,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    OrderStatus Status,
    decimal TotalAmount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
