using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.ManualOrders.CreateManualOrder;

public sealed record ManualOrderServiceRequest(Guid ServiceId, int Quantity);

public sealed record CreateManualOrderRequest(
    string CustomerName,
    string MobileNumber,
    string? EmailAddress,
    FulfillmentType Method,
    string? Address,
    DateOnly ScheduledDate,
    string ScheduledTime,
    PaymentMethod PaymentMethod,
    IReadOnlyList<ManualOrderServiceRequest> Services,
    decimal AdditionalCharge,
    string? AdditionalChargeReason,
    decimal Discount,
    string? DiscountReason,
    string? Notes,
    string? SpecialInstructions,
    PreferredNotificationChannel PreferredNotificationChannel,
    PickupLocationRequest? PickupLocation,
    bool AllowDuplicate = false);
