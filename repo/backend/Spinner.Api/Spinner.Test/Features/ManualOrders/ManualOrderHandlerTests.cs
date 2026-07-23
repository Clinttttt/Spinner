using Microsoft.EntityFrameworkCore;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.ManualOrders.CreateManualOrder;
using Spinner.Api.Features.ManualOrders.GetManualOrders;
using Spinner.Api.Features.Orders;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.ManualOrders;

public sealed class ManualOrderHandlerTests
{
    [Fact]
    public async Task CreateManualOrder_Should_Create_Owner_Sourced_MultiService_Order()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var wash = CreateService("Wash, Dry & Fold", 170m, true, 30m);
        var dry = CreateService("Dry Only", 80m, true, 20m);
        dbContext.LaundryServices.AddRange(wash, dry);
        await dbContext.SaveChangesAsync();

        var location = new PickupLocationRequest(
            "Purok 3, Brgy. San Isidro, Davao City",
            7.1112m,
            125.6234m,
            "place-1",
            null,
            "San Isidro",
            "Davao City",
            "Blue gate beside the pharmacy",
            "Call before arrival",
            "GoogleMaps",
            true,
            DateTimeOffset.UtcNow);
        var command = new CreateManualOrderCommand(
            "Maria Santos",
            "09171234567",
            null,
            FulfillmentType.PickupAndDelivery,
            location.FormattedAddress,
            DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
            "9:00 AM",
            PaymentMethod.CashOnDelivery,
            [new ManualOrderServiceRequest(wash.Id, 2), new ManualOrderServiceRequest(dry.Id, 1)],
            20m,
            "Special handling",
            10m,
            "Loyal customer",
            "Handle with care",
            null,
            PreferredNotificationChannel.Sms,
            location);

        var result = await new CreateManualOrderHandler(dbContext)
            .Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(OrderSource.OwnerManual, result.Value!.Source);
        Assert.Equal(OrderStatus.Confirmed, result.Value.Status);
        Assert.Equal(2, result.Value.Services.Count);
        Assert.Equal(460m, result.Value.EstimatedTotalAmount);
        Assert.True(result.Value.PickupLocation!.LocationConfirmed);
        Assert.Single(dbContext.ActivityLogEntries);
    }

    [Fact]
    public async Task GetManualOrders_Should_Not_Return_CustomerWeb_Bookings()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var booking = await BookingTestData.CreateBookingAsync(dbContext);
        Assert.True(booking.IsSuccess);

        var result = await new GetManualOrdersHandler(dbContext)
            .Handle(new GetManualOrdersQuery(null, null, null), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Items);
        Assert.Equal(0, result.Value.TotalCount);
        Assert.Equal(OrderSource.CustomerWeb, (await dbContext.LaundryOrders.SingleAsync()).Source);
    }

    private static LaundryService CreateService(
        string name,
        decimal price,
        bool supportsPickup,
        decimal? deliveryFee) => new(
            name,
            null,
            "load",
            price,
            supportsPickup,
            deliveryFee,
            DateTimeOffset.UtcNow);
}
