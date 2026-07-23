using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.BusinessSettings.UpdatePaymentMethods;

public sealed record UpdatePaymentMethodsCommand(
    bool IsCashOnDeliveryEnabled,
    bool IsQrCodeOnlinePaymentEnabled) : IRequest<Result<BusinessSettingsResponse>>;
