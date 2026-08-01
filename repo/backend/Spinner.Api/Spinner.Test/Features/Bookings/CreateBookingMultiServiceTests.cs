using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Test.TestHelpers;
using DomainBusinessSettings = Spinner.Api.Domain.Business.BusinessSettings;

namespace Spinner.Test.Features.Bookings;

/// <summary>
/// The customer booking form lets a customer pick more than one service, so each
/// selection must survive as its own itemised order line.
/// </summary>
public sealed class CreateBookingMultiServiceTests
{
    [Fact]
    public async Task Should_Record_Every_Selected_Service_As_Its_Own_Line()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var (wash, dry) = SeedServices(dbContext);

        var result = await Handler(dbContext).Handle(
            Command(
                [new BookingServiceRequest(wash.Id, 2), new BookingServiceRequest(dry.Id, 1)]),
            CancellationToken.None);

        Assert.True(result.IsSuccess);

        var order = await dbContext.LaundryOrders
            .Include(item => item.ServiceItems)
            .SingleAsync();

        Assert.Equal(2, order.ServiceItems.Count);
        Assert.Equal(3, order.LoadCount);
        // 170 x 2 + 90 x 1 = 430 of services.
        Assert.Equal(430m, order.EstimatedServiceAmount);
        // The trip is charged once, at the highest configured delivery fee.
        Assert.Equal(60m, order.EstimatedDeliveryFee);
        Assert.Equal(490m, order.EstimatedTotalAmount);
    }

    [Fact]
    public async Task Should_Still_Accept_A_Single_Service_Request()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var (wash, _) = SeedServices(dbContext);

        // No Services list: the older ServiceId plus LoadCount shape.
        var result = await Handler(dbContext).Handle(
            new CreateBookingCommand(
                "Kendra Mae",
                "09171234567",
                null,
                wash.Id,
                FulfillmentType.PickupAndDelivery,
                "Purok 3, San Vicente",
                DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
                "08:00-10:00",
                PaymentMethod.CashOnDelivery,
                2,
                null),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        var order = await dbContext.LaundryOrders.Include(item => item.ServiceItems).SingleAsync();
        Assert.Single(order.ServiceItems);
        Assert.Equal(2, order.LoadCount);
        Assert.Equal(340m, order.EstimatedServiceAmount);
    }

    [Fact]
    public async Task Should_Reject_The_Same_Service_Twice()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var (wash, _) = SeedServices(dbContext);

        var result = await Handler(dbContext).Handle(
            Command([new BookingServiceRequest(wash.Id, 1), new BookingServiceRequest(wash.Id, 1)]),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Validation, result.Status);
    }

    [Fact]
    public async Task Should_Reject_A_Pickup_Booking_With_A_Non_Pickup_Service()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var (wash, _) = SeedServices(dbContext);
        var inShopOnly = new LaundryService(
            "Self-Service",
            null,
            "wash",
            80m,
            supportsPickupAndDelivery: false,
            deliveryFee: null,
            DateTimeOffset.UtcNow);
        dbContext.LaundryServices.Add(inShopOnly);
        await dbContext.SaveChangesAsync();

        var result = await Handler(dbContext).Handle(
            Command(
                [new BookingServiceRequest(wash.Id, 1), new BookingServiceRequest(inShopOnly.Id, 1)]),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("pickup and delivery", result.Error.Message);
    }

    [Fact]
    public async Task Should_Reject_An_Unknown_Service()
    {
        await using var dbContext = AppDbContextFactory.Create();
        SeedServices(dbContext);

        var result = await Handler(dbContext).Handle(
            Command([new BookingServiceRequest(Guid.NewGuid(), 1)]),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.NotFound, result.Status);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(50)]
    public void Should_Accept_Quantities_Within_Bounds(int quantity)
    {
        var result = new CreateBookingValidator().Validate(
            Command([new BookingServiceRequest(Guid.NewGuid(), quantity)]));

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    [InlineData(51)]
    public void Should_Reject_An_Implausible_Quantity(int quantity)
    {
        var result = new CreateBookingValidator().Validate(
            Command([new BookingServiceRequest(Guid.NewGuid(), quantity)]));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName.Contains("Quantity"));
    }

    [Fact]
    public void Should_Reject_The_Same_Service_Listed_Twice()
    {
        var serviceId = Guid.NewGuid();

        // Two lines for one service would double the customer's bill for a single
        // tick of the checkbox, so it is refused rather than silently merged.
        var result = new CreateBookingValidator().Validate(
            Command(
                [new BookingServiceRequest(serviceId, 1), new BookingServiceRequest(serviceId, 2)]));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.ErrorMessage.Contains("only be listed once"));
    }

    [Fact]
    public void Should_Not_Require_LoadCount_When_Services_Are_Listed()
    {
        // The per-service steppers replace the old shared loads field, so the
        // scalar is only meaningful for the legacy single-service shape.
        var result = new CreateBookingValidator().Validate(
            Command([new BookingServiceRequest(Guid.NewGuid(), 2)]));

        Assert.True(result.IsValid);
        Assert.DoesNotContain(result.Errors, error => error.PropertyName == "LoadCount");
    }

    private static CreateBookingHandler Handler(AppDbContext dbContext) =>
        new(dbContext, new TestServiceAreaPolicyProvider());

    private static CreateBookingCommand Command(
        IReadOnlyList<BookingServiceRequest> services) => new(
        "Kendra Mae",
        "09171234567",
        null,
        Guid.Empty,
        FulfillmentType.PickupAndDelivery,
        "Purok 3, San Vicente",
        DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
        "08:00-10:00",
        PaymentMethod.CashOnDelivery,
        0,
        null,
        null,
        services);

    private static (LaundryService Wash, LaundryService Dry) SeedServices(AppDbContext dbContext)
    {
        var wash = new LaundryService(
            "Wash, Dry & Fold", null, "load", 170m, true, 60m, DateTimeOffset.UtcNow);
        var dry = new LaundryService(
            "Dry Only", null, "load", 90m, true, 60m, DateTimeOffset.UtcNow);

        dbContext.LaundryServices.AddRange(wash, dry);
        dbContext.BusinessSettings.Add(new DomainBusinessSettings(
            "Engr. Spin Laundry", "09170000000", "Madrid, Surigao del Sur", DateTimeOffset.UtcNow));
        dbContext.SaveChanges();

        return (wash, dry);
    }
}
