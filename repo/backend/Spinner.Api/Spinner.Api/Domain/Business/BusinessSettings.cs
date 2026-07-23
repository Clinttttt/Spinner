using Spinner.Api.Common.Results;

namespace Spinner.Api.Domain.Business;

public sealed class BusinessSettings
{
    private BusinessSettings()
    {
    }

    public BusinessSettings(
        string businessName,
        string phoneNumber,
        string address,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        BusinessName = businessName.Trim();
        PhoneNumber = phoneNumber.Trim();
        Address = address.Trim();
        OperatingHours = "Monday-Sunday: 8:00 AM - 6:00 PM";
        PickupTimeWindows = "6:00 AM - 8:00 AM; 9:00 AM - 11:00 AM";
        IsCashOnDeliveryEnabled = true;
        IsQrCodeOnlinePaymentEnabled = false;
        IsSmsBookingReceivedEnabled = true;
        IsSmsBookingConfirmedEnabled = true;
        IsSmsPickedUpEnabled = true;
        IsSmsReadyForDeliveryEnabled = true;
        IsSmsCompletedEnabled = true;
        IsEmailBookingConfirmedEnabled = true;
        IsEmailReceiptEnabled = true;
        IsEmailCompletedEnabled = true;
        CreatedAt = now;
        UpdatedAt = now;
    }

    public Guid Id { get; private set; }
    public string BusinessName { get; private set; } = string.Empty;
    public string? LogoUrl { get; private set; }
    public string PhoneNumber { get; private set; } = string.Empty;
    public string Address { get; private set; } = string.Empty;
    public string OperatingHours { get; private set; } = string.Empty;
    public string PickupTimeWindows { get; private set; } = string.Empty;
    public bool IsCashOnDeliveryEnabled { get; private set; }
    public bool IsQrCodeOnlinePaymentEnabled { get; private set; }
    public bool IsSmsBookingReceivedEnabled { get; private set; }
    public bool IsSmsBookingConfirmedEnabled { get; private set; }
    public bool IsSmsPickedUpEnabled { get; private set; }
    public bool IsSmsReadyForDeliveryEnabled { get; private set; }
    public bool IsSmsCompletedEnabled { get; private set; }
    public bool IsEmailBookingConfirmedEnabled { get; private set; }
    public bool IsEmailReceiptEnabled { get; private set; }
    public bool IsEmailCompletedEnabled { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void UpdateProfile(
        string businessName,
        string? logoUrl,
        string phoneNumber,
        string address,
        DateTimeOffset now)
    {
        BusinessName = businessName.Trim();
        LogoUrl = string.IsNullOrWhiteSpace(logoUrl) ? null : logoUrl.Trim();
        PhoneNumber = phoneNumber.Trim();
        Address = address.Trim();
        UpdatedAt = now;
    }

    public void UpdateOperatingHours(string operatingHours, DateTimeOffset now)
    {
        OperatingHours = operatingHours.Trim();
        UpdatedAt = now;
    }

    public void UpdatePickupTimes(string pickupTimeWindows, DateTimeOffset now)
    {
        PickupTimeWindows = pickupTimeWindows.Trim();
        UpdatedAt = now;
    }

    public Result UpdatePaymentMethods(
        bool isCashOnDeliveryEnabled,
        bool isQrCodeOnlinePaymentEnabled,
        DateTimeOffset now)
    {
        if (!isCashOnDeliveryEnabled && !isQrCodeOnlinePaymentEnabled)
            return Result.Validation("At least one MVP payment method must be enabled.");

        IsCashOnDeliveryEnabled = isCashOnDeliveryEnabled;
        IsQrCodeOnlinePaymentEnabled = isQrCodeOnlinePaymentEnabled;
        UpdatedAt = now;

        return Result.Success();
    }

    public void UpdateNotificationSettings(
        bool isSmsBookingReceivedEnabled,
        bool isSmsBookingConfirmedEnabled,
        bool isSmsPickedUpEnabled,
        bool isSmsReadyForDeliveryEnabled,
        bool isSmsCompletedEnabled,
        bool isEmailBookingConfirmedEnabled,
        bool isEmailReceiptEnabled,
        bool isEmailCompletedEnabled,
        DateTimeOffset now)
    {
        IsSmsBookingReceivedEnabled = isSmsBookingReceivedEnabled;
        IsSmsBookingConfirmedEnabled = isSmsBookingConfirmedEnabled;
        IsSmsPickedUpEnabled = isSmsPickedUpEnabled;
        IsSmsReadyForDeliveryEnabled = isSmsReadyForDeliveryEnabled;
        IsSmsCompletedEnabled = isSmsCompletedEnabled;
        IsEmailBookingConfirmedEnabled = isEmailBookingConfirmedEnabled;
        IsEmailReceiptEnabled = isEmailReceiptEnabled;
        IsEmailCompletedEnabled = isEmailCompletedEnabled;
        UpdatedAt = now;
    }
}
