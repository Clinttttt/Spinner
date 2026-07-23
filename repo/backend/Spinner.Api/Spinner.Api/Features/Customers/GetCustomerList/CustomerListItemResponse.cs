namespace Spinner.Api.Features.Customers.GetCustomerList;

public sealed record CustomerListItemResponse(
    Guid CustomerId,
    string FullName,
    string MobileNumber,
    string? EmailAddress,
    int TotalOrders,
    DateTimeOffset? LastOrderAt,
    decimal TotalSpent);
