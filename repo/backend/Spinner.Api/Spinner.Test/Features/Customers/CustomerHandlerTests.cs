using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Customers;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Customers.GetCustomerDetails;
using Spinner.Api.Features.Customers.GetCustomerList;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Customers;

public sealed class CustomerHandlerTests
{
    [Fact]
    public async Task GetCustomerList_Should_Show_Repeat_Customers_And_Total_Spent()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var customer = new Customer("Maria Santos", "09171234567", "maria@example.com", DateTimeOffset.UtcNow);

        await SeedOrderAsync(dbContext, customer, "ORD-001", paid: true);
        await SeedOrderAsync(dbContext, customer, "ORD-002", paid: false);
        await SeedOrderAsync(dbContext, new Customer("Juan Dela Cruz", "09175550000", null, DateTimeOffset.UtcNow), "ORD-003", paid: false);

        var result = await new GetCustomerListHandler(dbContext)
            .Handle(new GetCustomerListQuery("maria"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var customers = result.Value!.Items;
        Assert.Single(customers);
        Assert.Equal(customer.Id, customers[0].CustomerId);
        Assert.Equal(2, customers[0].TotalOrders);
        Assert.Equal(200m, customers[0].TotalSpent);
        Assert.Equal(1, result.Value.TotalCount);
    }

    [Fact]
    public async Task GetCustomerDetails_Should_Return_Profile_And_Recent_Orders()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var customer = new Customer("Maria Santos", "09171234567", "maria@example.com", DateTimeOffset.UtcNow);

        await SeedOrderAsync(dbContext, customer, "ORD-001", paid: true);
        await SeedOrderAsync(dbContext, customer, "ORD-002", paid: false);

        var result = await new GetCustomerDetailsHandler(dbContext)
            .Handle(new GetCustomerDetailsQuery(customer.Id), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Maria Santos", result.Value!.FullName);
        Assert.Equal(2, result.Value.TotalOrders);
        Assert.Equal(200m, result.Value.TotalSpent);
        Assert.Equal(2, result.Value.RecentOrders.Count);
    }

    [Fact]
    public async Task GetCustomerDetails_Should_Return_NotFound_For_Unknown_Customer()
    {
        await using var dbContext = AppDbContextFactory.Create();

        var result = await new GetCustomerDetailsHandler(dbContext)
            .Handle(new GetCustomerDetailsQuery(Guid.NewGuid()), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.NotFound, result.Status);
    }

    private static async Task SeedOrderAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        Customer customer,
        string orderCode,
        bool paid)
    {
        var now = DateTimeOffset.UtcNow;
        var service = new LaundryService(
            "Wash, Dry & Fold",
            null,
            "load",
            170m,
            supportsPickupAndDelivery: true,
            deliveryFee: 30m,
            now);
        var order = new LaundryOrder(
            orderCode,
            $"TRK-{orderCode}",
            customer,
            service,
            FulfillmentType.PickupAndDelivery,
            "Brgy. 10",
            DateOnly.FromDateTime(DateTime.UtcNow.Date),
            "6:00 AM - 8:00 AM",
            PaymentMethod.CashOnDelivery,
            1,
            null,
            now);

        order.Confirm(now);

        if (paid)
            order.ConfirmCodPayment($"DR-{orderCode}", now);

        if (!dbContext.Customers.Local.Any(existing => existing.Id == customer.Id))
            dbContext.Customers.Add(customer);

        dbContext.LaundryServices.Add(service);
        dbContext.LaundryOrders.Add(order);
        await dbContext.SaveChangesAsync();
    }
}
