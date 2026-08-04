using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Spinner.Api.Common.Security;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Bookings;
using Spinner.Api.Features.Bookings.ConfirmBooking;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Api.Features.Bookings.GetBookingConfirmation;
using Spinner.Api.Features.Bookings.GetBookingCheckoutStatus;
using Spinner.Api.Features.Bookings.GetBookings;
using Spinner.Api.Features.Bookings.StartBookingCheckout;
using Spinner.Api.Features.Bookings.RejectBooking;
using Spinner.Api.Features.Bookings.RescheduleBooking;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Controllers;

[Route("api/bookings")]
public sealed class BookingsController : ApiControllerBase
{
    public BookingsController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<PagedResponse<BookingListItemResponse>>> GetList(
        [FromQuery] string? search,
        [FromQuery] OrderStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        [FromQuery] bool includeCleared = false,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(
            new GetBookingsQuery(search, status, page, pageSize, includeCleared),
            ct);
        return HandleResponse(result);
    }

    [EnableRateLimiting(RateLimitPolicies.Booking)]
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<BookingConfirmationResponse>> Create(
        [FromBody] CreateBookingRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            ToCommand(request),
            ct);
        return HandleResponse(result);
    }

    /// <summary>
    /// Opens a paid checkout for a QR booking. The order is created only once the
    /// payment is confirmed, so an abandoned checkout leaves nothing behind.
    /// </summary>
    [EnableRateLimiting(RateLimitPolicies.Booking)]
    [HttpPost("checkout")]
    [AllowAnonymous]
    public async Task<ActionResult<BookingCheckoutResponse>> StartCheckout(
        [FromBody] CreateBookingRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(new StartBookingCheckoutCommand(ToCommand(request)), ct);
        return HandleResponse(result);
    }

    /// <summary>
    /// Backs the customer's payment-complete page. Anonymous by design, which is why
    /// the reference carries random characters rather than being sequential.
    /// </summary>
    [EnableRateLimiting(RateLimitPolicies.PublicLookup)]
    [HttpGet("checkout/{reference}")]
    [AllowAnonymous]
    public async Task<ActionResult<BookingCheckoutStatusResponse>> GetCheckoutStatus(
        string reference,
        CancellationToken ct)
    {
        var result = await Sender.Send(new GetBookingCheckoutStatusQuery(reference), ct);
        return HandleResponse(result);
    }

    private static CreateBookingCommand ToCommand(CreateBookingRequest request) =>
        new(
            request.FullName,
            request.MobileNumber,
            request.EmailAddress,
            request.ServiceId,
            request.FulfillmentType,
            request.Address,
            request.PreferredDate,
            request.PreferredTimeWindow,
            request.PaymentMethod,
            request.LoadCount,
            request.AdditionalNotes,
            request.PickupLocation,
            request.Services);

    [EnableRateLimiting(RateLimitPolicies.PublicLookup)]
    [HttpGet("{orderCode}/confirmation")]
    [AllowAnonymous]
    public async Task<ActionResult<BookingConfirmationResponse>> GetConfirmation(
        string orderCode,
        CancellationToken ct)
    {
        var result = await Sender.Send(new GetBookingConfirmationQuery(orderCode), ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/confirm")]
    [Authorize]
    public async Task<ActionResult<OrderDetailsResponse>> Confirm(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new ConfirmBookingCommand(id), ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize]
    public async Task<ActionResult<OrderDetailsResponse>> Reject(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new RejectBookingCommand(id), ct);
        return HandleResponse(result);
    }

    [HttpPost("{id:guid}/reschedule")]
    [Authorize]
    public async Task<ActionResult<OrderDetailsResponse>> Reschedule(
        Guid id,
        [FromBody] RescheduleBookingRequest request,
        CancellationToken ct)
    {
        var result = await Sender.Send(
            new RescheduleBookingCommand(id, request.PreferredDate, request.PreferredTimeWindow),
            ct);

        return HandleResponse(result);
    }
}
