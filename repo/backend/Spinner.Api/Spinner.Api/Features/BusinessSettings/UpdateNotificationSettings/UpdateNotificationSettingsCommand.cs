using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.BusinessSettings.UpdateNotificationSettings;

public sealed record UpdateNotificationSettingsCommand(
    bool IsSmsBookingReceivedEnabled,
    bool IsSmsBookingConfirmedEnabled,
    bool IsSmsPickedUpEnabled,
    bool IsSmsReadyForDeliveryEnabled,
    bool IsSmsCompletedEnabled,
    bool IsEmailBookingConfirmedEnabled,
    bool IsEmailReceiptEnabled,
    bool IsEmailCompletedEnabled) : IRequest<Result<BusinessSettingsResponse>>;
