using Spinner.Api.Domain.Business;

namespace Spinner.Test.Domain.Business;

public sealed class BusinessSettingsTests
{
    [Fact]
    public void New_Settings_Should_Enable_Cod_By_Default()
    {
        var settings = CreateSettings();

        Assert.True(settings.IsCashOnDeliveryEnabled);
        Assert.False(settings.IsQrCodeOnlinePaymentEnabled);
    }

    [Fact]
    public void UpdatePaymentMethods_Should_Fail_When_All_Mvp_Methods_Are_Disabled()
    {
        var settings = CreateSettings();

        var result = settings.UpdatePaymentMethods(false, false, DateTimeOffset.UtcNow);

        Assert.False(result.IsSuccess);
        Assert.True(settings.IsCashOnDeliveryEnabled);
    }

    [Fact]
    public void UpdateNotificationSettings_Should_Update_Sms_And_Email_Toggles()
    {
        var settings = CreateSettings();

        settings.UpdateNotificationSettings(
            isSmsBookingReceivedEnabled: false,
            isSmsBookingConfirmedEnabled: true,
            isSmsPickedUpEnabled: false,
            isSmsReadyForDeliveryEnabled: true,
            isSmsCompletedEnabled: false,
            isEmailBookingConfirmedEnabled: true,
            isEmailReceiptEnabled: false,
            isEmailCompletedEnabled: true,
            DateTimeOffset.UtcNow);

        Assert.False(settings.IsSmsBookingReceivedEnabled);
        Assert.True(settings.IsSmsBookingConfirmedEnabled);
        Assert.False(settings.IsEmailReceiptEnabled);
        Assert.True(settings.IsEmailCompletedEnabled);
    }

    private static BusinessSettings CreateSettings() => new(
        "Engr. Spin Laundry",
        "09170000000",
        "Cabadbaran City",
        DateTimeOffset.UtcNow);
}
