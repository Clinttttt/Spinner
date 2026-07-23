using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Api.Features.Orders.GetOrderDetails;
using Spinner.Test.TestHelpers;
using DomainBusinessSettings = Spinner.Api.Domain.Business.BusinessSettings;

namespace Spinner.Test.Features.Orders;

public sealed class GetOrderDetailsHandlerTests
{
    [Fact]
    public async Task GetOrderDetails_Should_Return_Order_With_Customer_And_Service_Data()
    {
        await using var dbContext = AppDbContextFactory.Create();
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
        await dbContext.SaveChangesAsync();

        var created = await new CreateBookingHandler(dbContext).Handle(
            new CreateBookingCommand(
                "Maria Santos",
                "09171234567",
                null,
                service.Id,
                FulfillmentType.PickupAndDelivery,
                "Brgy. 10",
                DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
                "6:00 AM - 8:00 AM",
                PaymentMethod.CashOnDelivery,
                1,
                null),
            CancellationToken.None);

        var result = await new GetOrderDetailsHandler(dbContext)
            .Handle(new GetOrderDetailsQuery(created.Value!.OrderId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Maria Santos", result.Value!.CustomerName);
        Assert.Equal("Wash, Dry & Fold", result.Value.ServiceName);
    }

    [Fact]
    public async Task GetOrderDetails_Should_Return_NotFound_When_Order_Does_Not_Exist()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await new GetOrderDetailsHandler(dbContext)
            .Handle(new GetOrderDetailsQuery(Guid.NewGuid()), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.NotFound, result.Status);
    }
}
