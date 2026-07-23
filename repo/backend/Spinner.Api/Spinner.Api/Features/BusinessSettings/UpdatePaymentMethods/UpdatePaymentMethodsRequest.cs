namespace Spinner.Api.Features.BusinessSettings.UpdatePaymentMethods;

public sealed record UpdatePaymentMethodsRequest(
    bool IsCashOnDeliveryEnabled,
    bool IsQrCodeOnlinePaymentEnabled);
