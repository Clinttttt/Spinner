using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Operations.GetNewBookingRequests;

public sealed record NewBookingRequestResponse(
    Guid OrderId,
    string OrderCode,
    string CustomerName,
    string MobileNumber,
    string ServiceName,
    FulfillmentType FulfillmentType,
    string Address,
    DateOnly PreferredDate,
    string PreferredTimeWindow,
    PaymentMethod PaymentMethod,
    PaymentStatus PaymentStatus,
    decimal EstimatedTotalAmount,
    DateTimeOffset CreatedAt);
