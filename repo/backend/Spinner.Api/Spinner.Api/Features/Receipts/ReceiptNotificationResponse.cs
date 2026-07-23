namespace Spinner.Api.Features.Receipts;

public sealed record ReceiptNotificationResponse(
    Guid OrderId,
    string OrderCode,
    string ReceiptCode,
    bool SmsQueued,
    bool EmailQueued);
