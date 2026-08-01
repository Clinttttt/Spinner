using Microsoft.EntityFrameworkCore;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.Pickups.GetPickupSchedule;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Pickups;

/// <summary>
/// The rider confirms collection in the field, so the schedule payload has to
/// carry what the customer actually booked. It previously returned service names
/// only, which meant the confirmation could not quote loads, money, or the
/// landmark, and the owner had to open the order to check.
/// </summary>
public sealed class PickupScheduleDetailTests
{
    [Fact]
    public async Task Should_Carry_Priced_Service_Lines_And_Totals()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(dbContext);
        var order = await dbContext.LaundryOrders
            .Include(item => item.ServiceItems)
            .SingleAsync(item => item.Id == created.Value!.OrderId);

        var result = await new GetPickupScheduleHandler(dbContext)
            .Handle(new GetPickupScheduleQuery(order.PreferredDate), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var pickup = Assert.Single(result.Value!.Items);

        var line = Assert.Single(pickup.ServiceLines);
        Assert.Equal(order.ServiceItems.First().ServiceName, line.Name);
        Assert.Equal(order.ServiceItems.First().Quantity, line.Quantity);
        Assert.Equal(order.ServiceItems.First().Subtotal, line.Subtotal);
        Assert.False(string.IsNullOrWhiteSpace(line.UnitLabel));

        Assert.Equal(order.LoadCount, pickup.LoadCount);
        Assert.Equal(order.EstimatedServiceAmount, pickup.EstimatedServiceAmount);
        Assert.Equal(order.EstimatedDeliveryFee, pickup.EstimatedDeliveryFee);
        Assert.Equal(order.EstimatedTotalAmount, pickup.EstimatedTotalAmount);
        // Zero totals would silently drop the money lines from the confirmation.
        Assert.True(pickup.EstimatedTotalAmount > 0m);
    }

    [Fact]
    public async Task Should_Carry_The_Landmark_And_Customer_Notes()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await BookingTestData.CreateBookingAsync(
            dbContext,
            pickupLocation: new Spinner.Api.Features.Orders.PickupLocationRequest(
                "Purok 4, San Vicente, Carmen",
                9.2374m,
                125.9616m,
                null,
                null,
                "San Vicente",
                "Carmen",
                "Beside the blue gate",
                "Ring the bell twice",
                "manualPin",
                true,
                DateTimeOffset.UtcNow),
            additionalNotes: "Please separate the whites.");

        var order = await dbContext.LaundryOrders
            .SingleAsync(item => item.Id == created.Value!.OrderId);

        var result = await new GetPickupScheduleHandler(dbContext)
            .Handle(new GetPickupScheduleQuery(order.PreferredDate), CancellationToken.None);

        var pickup = Assert.Single(result.Value!.Items);
        Assert.Equal("Beside the blue gate", pickup.PickupLocation!.Landmark);
        Assert.Equal("Ring the bell twice", pickup.PickupLocation.PickupInstructions);
        Assert.Equal("Please separate the whites.", pickup.AdditionalNotes);
    }
}
