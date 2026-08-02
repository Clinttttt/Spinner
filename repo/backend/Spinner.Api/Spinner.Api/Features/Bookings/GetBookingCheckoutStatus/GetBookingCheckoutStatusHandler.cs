using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Time;
using Spinner.Api.Database;
using Spinner.Api.Domain.Payments;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Api.Features.Bookings.StartBookingCheckout;
using Spinner.Api.Features.BusinessSettings;
using Spinner.Api.Features.Payments;

namespace Spinner.Api.Features.Bookings.GetBookingCheckoutStatus;

/// <summary>
/// Reports a checkout's real state, and finishes the job if the webhook was late.
/// </summary>
/// <remarks>
/// The customer is looking at this page immediately after paying, which is exactly
/// when a webhook may still be in flight or may have been lost. Rather than show a
/// paid customer an indefinite spinner, this retries the same finalisation step the
/// webhook performs. It is safe: both routes go through the one guarded path, so
/// whichever gets there first wins and the other reads back the same order.
/// </remarks>
public sealed class GetBookingCheckoutStatusHandler
    : IRequestHandler<GetBookingCheckoutStatusQuery, Result<BookingCheckoutStatusResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly PaidBookingFinaliser _finaliser;
    private readonly IBusinessClock _clock;

    public GetBookingCheckoutStatusHandler(
        AppDbContext dbContext,
        PaidBookingFinaliser finaliser,
        IBusinessClock clock)
    {
        _dbContext = dbContext;
        _finaliser = finaliser;
        _clock = clock;
    }

    public async Task<Result<BookingCheckoutStatusResponse>> Handle(
        GetBookingCheckoutStatusQuery request,
        CancellationToken cancellationToken)
    {
        var reference = request.Reference?.Trim() ?? string.Empty;

        if (reference.Length is 0 or > 64)
            return Result<BookingCheckoutStatusResponse>.NotFound("That payment reference was not found.");

        var pending = await _dbContext.PendingBookings
            .FirstOrDefaultAsync(item => item.Reference == reference, cancellationToken);

        if (pending is null)
            return Result<BookingCheckoutStatusResponse>.NotFound("That payment reference was not found.");

        var now = _clock.Now;

        if (pending.HasExpired(now))
        {
            pending.MarkExpired(now);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        if (pending.Status == PendingBookingStatus.Paid && pending.OrderId is null)
            await _finaliser.FinaliseAsync(pending, now, cancellationToken);

        var booking = ReadBooking(pending);
        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        string? orderCode = null;
        string? trackingCode = null;
        var services = new List<CheckoutServiceLineResponse>();
        var serviceAmount = 0m;
        var deliveryFee = 0m;

        if (pending.OrderId is not null)
        {
            var order = await _dbContext.LaundryOrders
                .Include(item => item.ServiceItems)
                .FirstOrDefaultAsync(item => item.Id == pending.OrderId, cancellationToken);

            if (order is not null)
            {
                orderCode = order.OrderCode;
                trackingCode = order.TrackingCode;
                serviceAmount = order.EstimatedServiceAmount;
                deliveryFee = order.EstimatedDeliveryFee;
                services = order.ServiceItems
                    .Select(item => new CheckoutServiceLineResponse(
                        item.ServiceName, item.Quantity, item.UnitLabel, item.Subtotal))
                    .ToList();
            }
        }

        return Result<BookingCheckoutStatusResponse>.Success(new BookingCheckoutStatusResponse(
            pending.Reference,
            State(pending),
            pending.Amount,
            pending.Currency,
            // Only offered while the checkout can still be paid.
            pending.Status == PendingBookingStatus.AwaitingPayment ? pending.CheckoutUrl : null,
            orderCode,
            trackingCode,
            booking?.FulfillmentType,
            booking?.FullName ?? string.Empty,
            booking?.Address,
            booking?.PickupLocation?.Landmark,
            booking?.PreferredDate,
            booking?.PreferredTimeWindow,
            booking?.MobileNumber,
            services,
            serviceAmount,
            deliveryFee,
            settings.BusinessName,
            settings.Address));
    }

    private static string State(PendingBooking pending) => pending.Status switch
    {
        PendingBookingStatus.Paid => pending.OrderId is not null ? "paid" : "confirming",
        PendingBookingStatus.Failed => "failed",
        PendingBookingStatus.Expired => "expired",
        _ => "awaitingPayment",
    };

    private static CreateBookingCommand? ReadBooking(PendingBooking pending)
    {
        try
        {
            return JsonSerializer.Deserialize<CreateBookingCommand>(
                pending.PayloadJson, StartBookingCheckoutHandler.SerializerOptions);
        }
        catch (JsonException)
        {
            // The status page can still report payment state without the details.
            return null;
        }
    }
}
