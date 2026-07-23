using Spinner.Api.Domain.Business;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Bookings.CreateBooking;

namespace Spinner.Test.TestHelpers;

public static class BookingTestData
{
    public static async Task<Spinner.Api.Common.Results.Result<Spinner.Api.Features.Bookings.BookingConfirmationResponse>> CreateBookingAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        FulfillmentType fulfillmentType = FulfillmentType.PickupAndDelivery,
        PaymentMethod paymentMethod = PaymentMethod.CashOnDelivery)
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

        return await new CreateBookingHandler(dbContext).Handle(
            new CreateBookingCommand(
                "Maria Santos",
                "09171234567",
                null,
                service.Id,
                fulfillmentType,
                "Brgy. 10",
                DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
                "6:00 AM - 8:00 AM",
                paymentMethod,
                1,
                null),
            CancellationToken.None);
    }
}
