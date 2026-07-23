namespace Spinner.Api.Features.BusinessSettings.UpdateNotificationSettings;

public sealed record UpdateNotificationSettingsRequest(
    bool IsSmsBookingReceivedEnabled,
    bool IsSmsBookingConfirmedEnabled,
    bool IsSmsPickedUpEnabled,
    bool IsSmsReadyForDeliveryEnabled,
    bool IsSmsCompletedEnabled,
    bool IsEmailBookingConfirmedEnabled,
    bool IsEmailReceiptEnabled,
    bool IsEmailCompletedEnabled);
