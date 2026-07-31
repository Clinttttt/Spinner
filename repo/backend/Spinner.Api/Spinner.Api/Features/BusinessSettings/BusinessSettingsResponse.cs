using DomainBusinessSettings = Spinner.Api.Domain.Business.BusinessSettings;

namespace Spinner.Api.Features.BusinessSettings;

public sealed record BusinessSettingsResponse(
    Guid Id,
    string BusinessName,
    string? LogoUrl,
    string PhoneNumber,
    string Address,
    string OperatingHours,
    string PickupTimeWindows,
    bool IsCashOnDeliveryEnabled,
    bool IsQrCodeOnlinePaymentEnabled,
    bool IsSmsBookingReceivedEnabled,
    bool IsSmsBookingConfirmedEnabled,
    bool IsSmsPickedUpEnabled,
    bool IsSmsReadyForDeliveryEnabled,
    bool IsSmsCompletedEnabled,
    bool IsEmailBookingConfirmedEnabled,
    bool IsEmailReceiptEnabled,
    bool IsEmailCompletedEnabled,
    decimal? PickupOriginLatitude,
    decimal? PickupOriginLongitude,
    decimal PickupServiceRadiusKm,
    bool HasPickupServiceArea,
    DateTimeOffset UpdatedAt)
{
    public static BusinessSettingsResponse FromEntity(DomainBusinessSettings settings) => new(
        settings.Id,
        settings.BusinessName,
        settings.LogoUrl,
        settings.PhoneNumber,
        settings.Address,
        settings.OperatingHours,
        settings.PickupTimeWindows,
        settings.IsCashOnDeliveryEnabled,
        settings.IsQrCodeOnlinePaymentEnabled,
        settings.IsSmsBookingReceivedEnabled,
        settings.IsSmsBookingConfirmedEnabled,
        settings.IsSmsPickedUpEnabled,
        settings.IsSmsReadyForDeliveryEnabled,
        settings.IsSmsCompletedEnabled,
        settings.IsEmailBookingConfirmedEnabled,
        settings.IsEmailReceiptEnabled,
        settings.IsEmailCompletedEnabled,
        settings.PickupOriginLatitude,
        settings.PickupOriginLongitude,
        settings.PickupServiceRadiusKm,
        settings.HasPickupServiceArea,
        settings.UpdatedAt);
}
