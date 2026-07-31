using Spinner.Api.Common.Results;

namespace Spinner.Api.Domain.Business;

public sealed class BusinessSettings
{
    /// <summary>
    /// Seed value for a new business. The effective radius is always read from
    /// the stored setting, never from this constant, so it can be changed by the
    /// owner without a deployment.
    /// </summary>
    public const decimal DefaultPickupServiceRadiusKm = 15m;

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
        PickupServiceRadiusKm = DefaultPickupServiceRadiusKm;
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

    /// <summary>Shop latitude used as the centre of the pickup area.</summary>
    public decimal? PickupOriginLatitude { get; private set; }

    /// <summary>Shop longitude used as the centre of the pickup area.</summary>
    public decimal? PickupOriginLongitude { get; private set; }

    /// <summary>Maximum straight-line pickup distance from the shop, in kilometres.</summary>
    public decimal PickupServiceRadiusKm { get; private set; } = DefaultPickupServiceRadiusKm;

    /// <summary>
    /// The area can only be enforced once the shop's own coordinates are known.
    /// </summary>
    public bool HasPickupServiceArea =>
        PickupOriginLatitude is not null &&
        PickupOriginLongitude is not null &&
        PickupServiceRadiusKm > 0m;

    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>
    /// Sets the centre and size of the pickup area. Passing null coordinates
    /// clears the area, which disables enforcement.
    /// </summary>
    public Result UpdatePickupServiceArea(
        decimal? originLatitude,
        decimal? originLongitude,
        decimal radiusKm,
        DateTimeOffset now)
    {
        if (originLatitude is null != originLongitude is null)
            return Result.Validation("Provide both a latitude and a longitude, or neither.");

        if (originLatitude is < -90m or > 90m)
            return Result.Validation("Latitude must be between -90 and 90.");

        if (originLongitude is < -180m or > 180m)
            return Result.Validation("Longitude must be between -180 and 180.");

        if (radiusKm <= 0m)
            return Result.Validation("Pickup radius must be greater than zero.");

        if (radiusKm > 500m)
            return Result.Validation("Pickup radius must be 500 km or less.");

        PickupOriginLatitude = originLatitude;
        PickupOriginLongitude = originLongitude;
        PickupServiceRadiusKm = radiusKm;
        UpdatedAt = now;

        return Result.Success();
    }

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
