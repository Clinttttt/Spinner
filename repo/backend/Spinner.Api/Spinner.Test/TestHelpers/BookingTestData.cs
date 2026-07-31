using Spinner.Api.Domain.Business;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Bookings.CreateBooking;

namespace Spinner.Test.TestHelpers;

public static class BookingTestData
{
    private static int _sequence;

    /// <summary>
    /// Creates a booking that is distinct from previously created ones.
    /// Create-booking is idempotent inside a short replay window, so tests that
    /// need several bookings must not submit byte-identical requests.
    /// </summary>
    public static async Task<Spinner.Api.Common.Results.Result<Spinner.Api.Features.Bookings.BookingConfirmationResponse>> CreateBookingAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        FulfillmentType fulfillmentType = FulfillmentType.PickupAndDelivery,
        PaymentMethod paymentMethod = PaymentMethod.CashOnDelivery,
        Spinner.Api.Features.Orders.PickupLocationRequest? pickupLocation = null,
        string? preferredTimeWindow = null)
    {
        var supportsPickup = fulfillmentType == FulfillmentType.PickupAndDelivery;
        var service = new LaundryService(
            supportsPickup ? "Wash, Dry & Fold" : "Drop-off Laundry",
            null,
            "load",
            170m,
            supportsPickupAndDelivery: supportsPickup,
            deliveryFee: supportsPickup ? 30m : null,
            DateTimeOffset.UtcNow);

        dbContext.LaundryServices.Add(service);
        var settings = new BusinessSettings(
            "Engr. Spin Laundry",
            "09170000000",
            "Cabadbaran City",
            DateTimeOffset.UtcNow);

        if (paymentMethod == PaymentMethod.QrCodeOnlinePayment)
            settings.UpdatePaymentMethods(true, true, DateTimeOffset.UtcNow);

        dbContext.BusinessSettings.Add(settings);
        await dbContext.SaveChangesAsync();

        var slot = Interlocked.Increment(ref _sequence);
        var timeWindow = preferredTimeWindow ?? $"Slot {slot}: 6:00 AM - 8:00 AM";

        return await new CreateBookingHandler(dbContext).Handle(
            new CreateBookingCommand(
                "Maria Santos",
                "09171234567",
                null,
                service.Id,
                fulfillmentType,
                "Brgy. 10",
                DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
                timeWindow,
                paymentMethod,
                1,
                null,
                pickupLocation),
            CancellationToken.None);
    }
}
