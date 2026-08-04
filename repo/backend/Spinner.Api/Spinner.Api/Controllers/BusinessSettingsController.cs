using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Security;
using Spinner.Api.Features.BusinessSettings;
using Spinner.Api.Features.BusinessSettings.GetBusinessSettings;
using Spinner.Api.Features.BusinessSettings.UpdateBusinessProfile;
using Spinner.Api.Features.BusinessSettings.UpdateNotificationSettings;
using Spinner.Api.Features.BusinessSettings.UpdateOperatingHours;
using Spinner.Api.Features.BusinessSettings.UpdatePaymentMethods;
using Spinner.Api.Features.BusinessSettings.UpdatePickupServiceArea;
using Spinner.Api.Features.BusinessSettings.UpdatePickupTimes;

namespace Spinner.Api.Controllers;

[Route("api/business-settings")]
// Owner only. These endpoints set prices, service area and payment methods, which
// is the shop's commercial configuration rather than day-to-day work. The read
// below stays anonymous because the customer site needs it before anyone logs in.
[Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
public sealed class BusinessSettingsController : ApiControllerBase
{
    public BusinessSettingsController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<BusinessSettingsResponse>> Get(CancellationToken ct)
    {
        var result = await Sender.Send(new GetBusinessSettingsQuery(), ct);
        return HandleResponse(result);
    }

    [HttpPut("profile")]
    public async Task<ActionResult<BusinessSettingsResponse>> UpdateProfile(
        [FromBody] UpdateBusinessProfileRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new UpdateBusinessProfileCommand(
                request.BusinessName,
                request.LogoUrl,
                request.PhoneNumber,
                request.Address),
            ct);

        return HandleResponse(result);
    }

    [HttpPut("operating-hours")]
    public async Task<ActionResult<BusinessSettingsResponse>> UpdateOperatingHours(
        [FromBody] UpdateOperatingHoursRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(new UpdateOperatingHoursCommand(request.OperatingHours), ct);
        return HandleResponse(result);
    }

    [HttpPut("pickup-times")]
    public async Task<ActionResult<BusinessSettingsResponse>> UpdatePickupTimes(
        [FromBody] UpdatePickupTimesRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(new UpdatePickupTimesCommand(request.PickupTimeWindows), ct);
        return HandleResponse(result);
    }

    /// <summary>
    /// Sets the centre and radius of the pickup area. Omitting the coordinates
    /// clears the area and disables enforcement.
    /// </summary>
    [HttpPut("pickup-service-area")]
    public async Task<ActionResult<BusinessSettingsResponse>> UpdatePickupServiceArea(
        [FromBody] UpdatePickupServiceAreaRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new UpdatePickupServiceAreaCommand(
                request.OriginLatitude,
                request.OriginLongitude,
                request.RadiusKm),
            ct);

        return HandleResponse(result);
    }

    [HttpPut("payment-methods")]
    public async Task<ActionResult<BusinessSettingsResponse>> UpdatePaymentMethods(
        [FromBody] UpdatePaymentMethodsRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new UpdatePaymentMethodsCommand(
                request.IsCashOnDeliveryEnabled,
                request.IsQrCodeOnlinePaymentEnabled),
            ct);

        return HandleResponse(result);
    }

    [HttpPut("notification-settings")]
    public async Task<ActionResult<BusinessSettingsResponse>> UpdateNotificationSettings(
        [FromBody] UpdateNotificationSettingsRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new UpdateNotificationSettingsCommand(
                request.IsSmsBookingReceivedEnabled,
                request.IsSmsBookingConfirmedEnabled,
                request.IsSmsPickedUpEnabled,
                request.IsSmsReadyForDeliveryEnabled,
                request.IsSmsCompletedEnabled,
                request.IsEmailBookingConfirmedEnabled,
                request.IsEmailReceiptEnabled,
                request.IsEmailCompletedEnabled),
            ct);

        return HandleResponse(result);
    }
}
