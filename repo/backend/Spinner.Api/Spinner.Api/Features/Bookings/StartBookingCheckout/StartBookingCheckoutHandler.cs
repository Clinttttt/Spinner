using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Time;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Payments;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Api.Features.BusinessSettings;
using Spinner.Api.Integrations.OnlinePayments;

namespace Spinner.Api.Features.Bookings.StartBookingCheckout;

/// <summary>
/// Prices a QR booking, opens a hosted checkout, and holds the booking until paid.
/// </summary>
public sealed class StartBookingCheckoutHandler
    : IRequestHandler<StartBookingCheckoutCommand, Result<BookingCheckoutResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IPaymentCheckoutGateway _gateway;
    private readonly OnlinePaymentOptions _options;
    private readonly IBusinessClock _clock;

    public StartBookingCheckoutHandler(
        AppDbContext dbContext,
        IPaymentCheckoutGateway gateway,
        IOptions<OnlinePaymentOptions> options,
        IBusinessClock clock)
    {
        _dbContext = dbContext;
        _gateway = gateway;
        _options = options.Value;
        _clock = clock;
    }

    public async Task<Result<BookingCheckoutResponse>> Handle(
        StartBookingCheckoutCommand request,
        CancellationToken cancellationToken)
    {
        var booking = request.Booking;

        if (booking.PaymentMethod != PaymentMethod.QrCodeOnlinePayment)
            return Result<BookingCheckoutResponse>.Validation("Only QR online payment uses a checkout.");

        if (!_gateway.IsConfigured)
            return Result<BookingCheckoutResponse>.Conflict("Online payment is not available right now.");

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        if (!settings.IsQrCodeOnlinePaymentEnabled)
            return Result<BookingCheckoutResponse>.Validation("QR Code Online Payment is not enabled.");

        var selections = booking.ServiceSelections;
        var requestedIds = selections.Select(item => item.ServiceId).Distinct().ToList();

        if (requestedIds.Count != selections.Count)
            return Result<BookingCheckoutResponse>.Validation("A service can only be selected once.");

        var services = await _dbContext.LaundryServices
            .Where(service => requestedIds.Contains(service.Id))
            .ToListAsync(cancellationToken);

        if (services.Count != requestedIds.Count)
            return Result<BookingCheckoutResponse>.NotFound("One or more selected services were not found.");

        if (services.Any(service => !service.IsActive))
            return Result<BookingCheckoutResponse>.Conflict("One or more selected services are not active.");

        if (booking.FulfillmentType == FulfillmentType.PickupAndDelivery &&
            services.Any(service => !service.SupportsPickupAndDelivery))
        {
            return Result<BookingCheckoutResponse>.Validation(
                "Every selected service must support pickup and delivery.");
        }

        // Priced from the shop's own list. The client sends what was chosen, never
        // what it costs.
        var priced = selections
            .Select(selection => (
                Service: services.Single(service => service.Id == selection.ServiceId),
                selection.Quantity))
            .ToList();

        var quote = LaundryOrder.QuoteCustomerBooking(priced, booking.FulfillmentType);

        if (quote.TotalAmount <= 0m)
            return Result<BookingCheckoutResponse>.Validation("This booking has nothing to pay.");

        var now = _clock.Now;
        var payloadJson = JsonSerializer.Serialize(booking, SerializerOptions);
        var fingerprint = Fingerprint(payloadJson, quote.TotalAmount);

        // A second tap, or a back-and-resubmit, must reach the checkout that is
        // already open rather than a second one the customer could also pay.
        var existing = await _dbContext.PendingBookings
            .Where(pending =>
                pending.PayloadFingerprint == fingerprint &&
                pending.Status == PendingBookingStatus.AwaitingPayment &&
                pending.ExpiresAt > now)
            .OrderByDescending(pending => pending.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing?.CheckoutUrl is not null)
        {
            return Result<BookingCheckoutResponse>.Success(new BookingCheckoutResponse(
                existing.Reference, existing.CheckoutUrl, existing.Amount, existing.Currency));
        }

        var reference = BookingCheckoutReference.New(now);
        var pending = new PendingBooking(
            reference,
            payloadJson,
            quote.TotalAmount,
            "PHP",
            now,
            now.AddMinutes(Math.Max(5, _options.CheckoutMinutesToLive)));

        var items = priced
            .Select(entry => new CheckoutLineItem(
                entry.Service.Name,
                $"{entry.Quantity} {entry.Service.UnitLabel}",
                entry.Quantity,
                entry.Service.BasePrice))
            .ToList();

        if (quote.DeliveryFee > 0m)
            items.Add(new CheckoutLineItem("Pickup & delivery", "One trip", 1, quote.DeliveryFee));

        var session = await _gateway.CreateSessionAsync(
            new CheckoutSessionRequest(
                reference,
                $"{settings.BusinessName} laundry booking",
                items,
                quote.TotalAmount,
                booking.FullName,
                booking.MobileNumber,
                booking.EmailAddress,
                BuildReturnUrl(_options.CheckoutSuccessUrl, reference),
                BuildReturnUrl(_options.CheckoutCancelUrl, reference)),
            cancellationToken);

        if (!session.IsSuccess)
            return Result<BookingCheckoutResponse>.Conflict(session.Error.Message);

        pending.AttachCheckoutSession(session.Value!.SessionId, session.Value.CheckoutUrl, fingerprint, now);

        _dbContext.PendingBookings.Add(pending);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<BookingCheckoutResponse>.Success(new BookingCheckoutResponse(
            pending.Reference, pending.CheckoutUrl!, pending.Amount, pending.Currency));
    }

    internal static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private static string BuildReturnUrl(string baseUrl, string reference)
    {
        if (string.IsNullOrWhiteSpace(baseUrl)) return "https://example.invalid/pay";

        var separator = baseUrl.Contains('?') ? '&' : '?';
        return $"{baseUrl}{separator}ref={Uri.EscapeDataString(reference)}";
    }

    /// <summary>
    /// Identifies the same booking submitted twice. The amount is included so a
    /// price change produces a fresh checkout rather than reusing a stale total.
    /// </summary>
    private static string Fingerprint(string payloadJson, decimal amount)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes($"{amount:0.00}|{payloadJson}"));
        return Convert.ToHexStringLower(hash);
    }
}
