using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Bookings.GetBookingConfirmation;

public sealed class GetBookingConfirmationHandler
    : IRequestHandler<GetBookingConfirmationQuery, Result<BookingConfirmationResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetBookingConfirmationHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<BookingConfirmationResponse>> Handle(
        GetBookingConfirmationQuery request,
        CancellationToken cancellationToken)
    {
        // Accepts either code, in any case, ignoring stray spacing.
        //
        // The confirmation shows the customer an "Order reference" and a "Tracking
        // code", so someone trying to track their order naturally types the tracking
        // code — which used to return "not found". Matching was also case sensitive
        // and untrimmed, so a code pasted from a message or typed in lower case
        // failed too. None of that is the customer's mistake.
        var code = request.OrderCode?.Trim() ?? string.Empty;

        if (code.Length is 0 or > 64)
            return Result<BookingConfirmationResponse>.NotFound("Booking confirmation was not found.");

        var normalized = code.ToUpperInvariant();

        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(
                order =>
                    order.Source == OrderSource.CustomerWeb &&
                    (order.OrderCode.ToUpper() == normalized ||
                     order.TrackingCode.ToUpper() == normalized),
                cancellationToken);

        if (order is null)
            return Result<BookingConfirmationResponse>.NotFound("Booking confirmation was not found.");

        var response = new BookingConfirmationResponse(
            order.Id,
            order.OrderCode,
            order.TrackingCode,
            order.ContactName,
            // Masked, because this endpoint needs no account. Anyone holding a booking code
            // can read it, and codes travel: they are quoted in messages, screenshots and
            // over the counter. The contact details are not needed to answer "where is my
            // laundry", and the customer site never displays them from here, so returning
            // them in full only widened what a shared code gives away. The full values stay
            // available to the shop through the authenticated order endpoints.
            MaskMobile(order.Customer.MobileNumber),
            MaskEmail(order.Customer.EmailAddress),
            order.ServiceName,
            order.UnitLabel,
            order.LoadCount,
            order.FulfillmentType,
            order.Address,
            order.PreferredDate,
            order.PreferredTimeWindow,
            order.PaymentMethod,
            order.PaymentStatus,
            order.Status,
            order.EstimatedServiceAmount,
            order.EstimatedDeliveryFee,
            order.EstimatedTotalAmount,
            order.AdditionalNotes);

        return Result<BookingConfirmationResponse>.Success(response);
    }

    /// <summary>
    /// Leaves enough of a number for the customer to recognise it as theirs, and not enough
    /// to be worth harvesting. "09171234567" becomes "•••••••4567".
    /// </summary>
    private static string MaskMobile(string mobileNumber)
    {
        var digits = mobileNumber?.Trim() ?? string.Empty;

        if (digits.Length <= 4)
            return digits;

        return new string('\u2022', digits.Length - 4) + digits[^4..];
    }

    /// <summary>
    /// Keeps the shape of an address without giving it away. "maria@example.com" becomes
    /// "m•••@example.com".
    /// </summary>
    private static string? MaskEmail(string? emailAddress)
    {
        if (string.IsNullOrWhiteSpace(emailAddress)) return emailAddress;

        var trimmed = emailAddress.Trim();
        var at = trimmed.IndexOf('@');

        // Not an address shape this can safely shorten, so nothing is returned rather than
        // guessing which part is sensitive.
        if (at <= 0) return "\u2022\u2022\u2022";

        var name = trimmed[..at];
        var domain = trimmed[at..];

        return name.Length == 1
            ? $"{name}{domain}"
            : $"{name[0]}\u2022\u2022\u2022{domain}";
    }
}
