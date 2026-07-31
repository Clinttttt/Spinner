using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Geo;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Api.Features.Orders;
using Spinner.Test.TestHelpers;
using DomainBusinessSettings = Spinner.Api.Domain.Business.BusinessSettings;

namespace Spinner.Test.Features.ServiceArea;

/// <summary>
/// The service area is judged on coordinates, never on the written address, so a
/// booking is refused only when the chosen point is genuinely out of range.
/// </summary>
public sealed class BookingServiceAreaEnforcementTests
{
    private static readonly GeoPoint Shop = new(9.2381784m, 125.9624521m);

    [Fact]
    public async Task Should_Refuse_A_Pin_Outside_The_Pickup_Area()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);

        // Butuan City: far outside a 15 km radius.
        var result = await Handler(dbContext).Handle(
            Command(service.Id, PickupLocation(8.9475m, 125.5406m)),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Validation, result.Status);
        Assert.Contains("outside our", result.Error.Message);
        Assert.Empty(dbContext.LaundryOrders);
    }

    [Fact]
    public async Task Should_Accept_A_Pin_Inside_The_Pickup_Area()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);

        var result = await Handler(dbContext).Handle(
            Command(service.Id, PickupLocation(Shop.Latitude, Shop.Longitude)),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(1, await dbContext.LaundryOrders.CountAsync());
    }

    [Fact]
    public async Task Should_Accept_A_Booking_With_No_Pin_At_All()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);

        // A customer whose GPS failed, or whose purok no geocoder recognises,
        // must still be able to book. Staff resolve the location afterwards.
        var result = await Handler(dbContext).Handle(
            Command(service.Id, null),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Should_Accept_Any_Pin_When_No_Area_Is_Configured()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext);

        var handler = new CreateBookingHandler(dbContext, new TestServiceAreaPolicyProvider());
        var result = await handler.Handle(
            Command(service.Id, PickupLocation(8.9475m, 125.5406m)),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Should_Ignore_The_Area_For_A_Drop_Off_Booking()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedService(dbContext, supportsPickup: false);

        var command = Command(service.Id, PickupLocation(8.9475m, 125.5406m)) with
        {
            FulfillmentType = FulfillmentType.DropOff,
        };

        var result = await Handler(dbContext).Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
    }

    private static CreateBookingHandler Handler(AppDbContext dbContext) =>
        new(dbContext, TestServiceAreaPolicyProvider.WithRadius(Shop, 15m));

    private static PickupLocationRequest PickupLocation(decimal latitude, decimal longitude) => new(
        "Purok 3, San Vicente, Madrid",
        latitude,
        longitude,
        null,
        null,
        null,
        null,
        null,
        null,
        "manualPin",
        true,
        DateTimeOffset.UtcNow);

    private static CreateBookingCommand Command(
        Guid serviceId,
        PickupLocationRequest? pickupLocation) => new(
        "Kendra Mae",
        "09171234567",
        null,
        serviceId,
        FulfillmentType.PickupAndDelivery,
        "Purok 3, San Vicente, Madrid",
        DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
        "15:00-17:00",
        PaymentMethod.CashOnDelivery,
        1,
        null,
        pickupLocation);

    private static LaundryService SeedService(AppDbContext dbContext, bool supportsPickup = true)
    {
        var service = new LaundryService(
            "Wash, Dry & Fold",
            null,
            "load",
            170m,
            supportsPickup,
            supportsPickup ? 60m : null,
            DateTimeOffset.UtcNow);

        dbContext.LaundryServices.Add(service);
        dbContext.BusinessSettings.Add(new DomainBusinessSettings(
            "Engr. Spin Laundry",
            "09170000000",
            "Madrid, Surigao del Sur",
            DateTimeOffset.UtcNow));
        dbContext.SaveChanges();

        return service;
    }
}
