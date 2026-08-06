using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Reports.GetOrderHistory;

/// <summary>One service on an order, as the customer chose it.</summary>
public sealed record OrderHistoryServiceLineResponse(
    string ServiceName,
    string UnitLabel,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal);

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
    DateTimeOffset UpdatedAt,
    // Everything below was missing, which left the owner looking at a single service
    // name for an order that may have had several, and no idea where it was going.
    string? Address = null,
    string? TrackingCode = null,
    string? AdditionalNotes = null,
    int LoadCount = 0,
    decimal ServiceAmount = 0m,
    decimal DeliveryFee = 0m,
    string? ReceiptCode = null,
    DateTimeOffset? PaidAt = null,
    IReadOnlyList<OrderHistoryServiceLineResponse>? ServiceLines = null);
