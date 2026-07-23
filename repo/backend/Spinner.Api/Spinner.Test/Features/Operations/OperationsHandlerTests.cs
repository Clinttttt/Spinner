using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Api.Features.Operations.GetNewBookingRequests;
using Spinner.Api.Features.Operations.GetOperationsDashboard;
using Spinner.Test.TestHelpers;
using DomainBusinessSettings = Spinner.Api.Domain.Business.BusinessSettings;

namespace Spinner.Test.Features.Operations;

public sealed class OperationsHandlerTests
{
    [Fact]
    public async Task GetOperationsDashboard_Should_Return_NewBooking_And_Unpaid_Counts()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedPhase2Dependencies(dbContext);
        await CreateBookingAsync(dbContext, service.Id, "Maria Santos", "09171234567");
        await CreateBookingAsync(dbContext, service.Id, "Ana Cruz", "09170001111");

        var result = await new GetOperationsDashboardHandler(dbContext)
            .Handle(new GetOperationsDashboardQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.NewBookings);
        Assert.Equal(2, result.Value.UnpaidOrders);
    }

    [Fact]
    public async Task GetNewBookingRequests_Should_Return_BookingReceived_Orders()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var service = SeedPhase2Dependencies(dbContext);
        var created = await CreateBookingAsync(dbContext, service.Id, "Maria Santos", "09171234567");

        var result = await new GetNewBookingRequestsHandler(dbContext)
            .Handle(new GetNewBookingRequestsQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var booking = Assert.Single(result.Value!);
        Assert.Equal(created.Value!.OrderCode, booking.OrderCode);
        Assert.Equal("Maria Santos", booking.CustomerName);
        Assert.Equal(PaymentStatus.Unpaid, booking.PaymentStatus);
    }

    private static LaundryService SeedPhase2Dependencies(Spinner.Api.Database.AppDbContext dbContext)
    {
        var service = new LaundryService(
            "Wash, Dry & Fold",
            null,
            "load",
            170m,
            supportsPickupAndDelivery: true,
            deliveryFee: 30m,
            DateTimeOffset.UtcNow);

        dbContext.LaundryServices.Add(service);
        dbContext.BusinessSettings.Add(new DomainBusinessSettings(
            "Engr. Spin Laundry",
            "09170000000",
            "Cabadbaran City",
            DateTimeOffset.UtcNow));
        dbContext.SaveChanges();

        return service;
    }

    private static Task<Spinner.Api.Common.Results.Result<Spinner.Api.Features.Bookings.BookingConfirmationResponse>> CreateBookingAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        Guid serviceId,
        string fullName,
        string mobileNumber) =>
        new CreateBookingHandler(dbContext).Handle(
            new CreateBookingCommand(
                fullName,
                mobileNumber,
                null,
                serviceId,
                FulfillmentType.PickupAndDelivery,
                "Brgy. 10",
                DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
                "6:00 AM - 8:00 AM",
                PaymentMethod.CashOnDelivery,
                1,
                null),
            CancellationToken.None);
}
