using Spinner.Api.Domain.Customers;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;

namespace Spinner.Test.Domain;

/// <summary>
/// A QR booking is charged from the quote before the order exists, so the two must
/// agree to the centavo. If they drift, a customer is charged one amount and the
/// order records another, and the payment is then refused for not matching.
/// </summary>
public sealed class BookingQuoteMatchesCreatedOrderTests
{
    [Theory]
    [InlineData(FulfillmentType.PickupAndDelivery, 1)]
    [InlineData(FulfillmentType.PickupAndDelivery, 3)]
    [InlineData(FulfillmentType.DropOff, 2)]
    public void Should_Match_A_Single_Service_Order(FulfillmentType fulfillment, int quantity)
    {
        var wash = Service("Wash, Dry & Fold", 170m, 60m);
        var selections = new[] { (Service: wash, Quantity: quantity) };

        AssertMatches(selections, fulfillment);
    }

    [Theory]
    [InlineData(FulfillmentType.PickupAndDelivery)]
    [InlineData(FulfillmentType.DropOff)]
    public void Should_Match_A_Multi_Service_Order(FulfillmentType fulfillment)
    {
        var selections = new[]
        {
            (Service: Service("Wash, Dry & Fold", 170m, 60m), Quantity: 2),
            (Service: Service("Dry Only", 90m, 45m), Quantity: 1),
        };

        AssertMatches(selections, fulfillment);
    }

    [Fact]
    public void Should_Charge_One_Delivery_Fee_At_The_Highest_Rate()
    {
        var selections = new[]
        {
            (Service: Service("Wash, Dry & Fold", 170m, 60m), Quantity: 1),
            (Service: Service("Dry Only", 90m, 45m), Quantity: 1),
        };

        var quote = LaundryOrder.QuoteCustomerBooking(selections, FulfillmentType.PickupAndDelivery);

        // One trip collects everything, so the fee is charged once at the highest
        // configured rate rather than summed per service.
        Assert.Equal(60m, quote.DeliveryFee);
        Assert.Equal(260m, quote.ServiceAmount);
        Assert.Equal(320m, quote.TotalAmount);
    }

    private static void AssertMatches(
        (LaundryService Service, int Quantity)[] selections,
        FulfillmentType fulfillment)
    {
        var quote = LaundryOrder.QuoteCustomerBooking(selections, fulfillment);

        var order = LaundryOrder.CreateCustomerBooking(
            "ES-TEST",
            "TRK-TEST",
            new Customer("Clint Villanueva", "09384326772", null, DateTimeOffset.UtcNow),
            selections,
            fulfillment,
            "Purok 4, San Vicente, Carmen",
            DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(1)),
            "08:00-10:00",
            PaymentMethod.QrCodeOnlinePayment,
            null,
            DateTimeOffset.UtcNow);

        Assert.Equal(order.LoadCount, quote.LoadCount);
        Assert.Equal(order.EstimatedServiceAmount, quote.ServiceAmount);
        Assert.Equal(order.EstimatedDeliveryFee, quote.DeliveryFee);
        Assert.Equal(order.EstimatedTotalAmount, quote.TotalAmount);
    }

    private static LaundryService Service(string name, decimal price, decimal deliveryFee) =>
        new(name, null, "load", price, true, deliveryFee, DateTimeOffset.UtcNow);
}
