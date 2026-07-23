using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Customers.GetCustomerDetails;

public sealed record CustomerOrderHistoryItemResponse(
    Guid OrderId,
    string OrderCode,
    string ServiceName,
    DateOnly PreferredDate,
    PaymentStatus PaymentStatus,
    OrderStatus Status,
    decimal TotalAmount,
    DateTimeOffset CreatedAt);
