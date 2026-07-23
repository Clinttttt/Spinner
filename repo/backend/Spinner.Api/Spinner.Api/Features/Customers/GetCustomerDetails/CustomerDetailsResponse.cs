namespace Spinner.Api.Features.Customers.GetCustomerDetails;

public sealed record CustomerDetailsResponse(
    Guid CustomerId,
    string FullName,
    string MobileNumber,
    string? EmailAddress,
    int TotalOrders,
    DateTimeOffset? LastOrderAt,
    decimal TotalSpent,
    IReadOnlyList<CustomerOrderHistoryItemResponse> RecentOrders);
