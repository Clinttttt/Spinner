using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Customers;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.Reports.ExportOrderHistory;
using Spinner.Api.Features.Reports.GetDailySalesReport;
using Spinner.Api.Features.Reports.GetOrderHistory;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Reports;

public sealed class ReportHandlerTests
{
    [Fact]
    public async Task GetDailySalesReport_Should_Return_Daily_Performance_Summary()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var reportDate = DateOnly.FromDateTime(DateTime.UtcNow.Date);

        await SeedOrderAsync(
            dbContext,
            "ORD-PAID",
            "Maria Santos",
            "09171234567",
            reportDate,
            OrderSeedState.CompletedPaid);
        await SeedOrderAsync(
            dbContext,
            "ORD-UNPAID",
            "Juan Dela Cruz",
            "09175550000",
            reportDate,
            OrderSeedState.ConfirmedUnpaid);
        await SeedOrderAsync(
            dbContext,
            "ORD-REJECTED",
            "Ana Reyes",
            "09176660000",
            reportDate,
            OrderSeedState.Rejected);

        var result = await new GetDailySalesReportHandler(dbContext)
            .Handle(new GetDailySalesReportQuery(reportDate), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value!.TotalOrders);
        Assert.Equal(1, result.Value.CompletedOrders);
        Assert.Equal(1, result.Value.PendingOrders);
        Assert.Equal(1, result.Value.RejectedOrders);
        Assert.Equal(200m, result.Value.GrossSales);
        Assert.Equal(200m, result.Value.CashSales);
        Assert.Equal(200m, result.Value.UnpaidAmount);
        Assert.Equal("Wash, Dry & Fold", result.Value.TopServiceName);
    }

    [Fact]
    public async Task GetOrderHistory_Should_Search_By_Customer_And_Order_Code()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var reportDate = DateOnly.FromDateTime(DateTime.UtcNow.Date);

        await SeedOrderAsync(
            dbContext,
            "ORD-MARIA",
            "Maria Santos",
            "09171234567",
            reportDate,
            OrderSeedState.ConfirmedUnpaid);
        await SeedOrderAsync(
            dbContext,
            "ORD-JUAN",
            "Juan Dela Cruz",
            "09175550000",
            reportDate,
            OrderSeedState.ConfirmedUnpaid);

        var byCustomer = await new GetOrderHistoryHandler(dbContext)
            .Handle(new GetOrderHistoryQuery("maria", null, null), CancellationToken.None);
        var byOrderCode = await new GetOrderHistoryHandler(dbContext)
            .Handle(new GetOrderHistoryQuery("ORD-JUAN", null, null), CancellationToken.None);

        Assert.True(byCustomer.IsSuccess);
        var customerResults = byCustomer.Value!.Items;
        Assert.Single(customerResults);
        Assert.Equal("ORD-MARIA", customerResults[0].OrderCode);

        Assert.True(byOrderCode.IsSuccess);
        var orderCodeResults = byOrderCode.Value!.Items;
        Assert.Single(orderCodeResults);
        Assert.Equal("Juan Dela Cruz", orderCodeResults[0].CustomerName);
    }

    [Fact]
    public async Task ExportOrderHistory_Should_Return_Csv_Content()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var reportDate = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        await SeedOrderAsync(
            dbContext,
            "ORD-EXPORT",
            "Maria Santos",
            "09171234567",
            reportDate,
            OrderSeedState.CompletedPaid);

        var result = await new ExportOrderHistoryHandler(dbContext)
            .Handle(new ExportOrderHistoryQuery(null, reportDate, reportDate), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("text/csv", result.Value!.ContentType);
        Assert.Equal(1, result.Value.RowCount);
        Assert.Contains("Order Code,Source,Customer,Mobile", result.Value.Content);
        Assert.Contains("CustomerWeb", result.Value.Content);
        Assert.Contains("ORD-EXPORT", result.Value.Content);
    }

    private static async Task SeedOrderAsync(
        Spinner.Api.Database.AppDbContext dbContext,
        string orderCode,
        string customerName,
        string mobileNumber,
        DateOnly preferredDate,
        OrderSeedState state)
    {
        var now = DateTimeOffset.UtcNow;
        var customer = new Customer(customerName, mobileNumber, null, now);
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
            preferredDate,
            "6:00 AM - 8:00 AM",
            PaymentMethod.CashOnDelivery,
            1,
            null,
            now);

        if (state == OrderSeedState.Rejected)
        {
            order.Reject(now);
        }
        else
        {
            order.Confirm(now);

            if (state == OrderSeedState.CompletedPaid)
            {
                order.MarkPickedUp(now);
                order.MarkBeingProcessed(now);
                order.MarkReadyForDelivery(now);
                order.ConfirmCodPayment($"DR-{orderCode}", now);
                order.UpdateStatus(OrderStatus.Completed, now);
            }
        }

        dbContext.Customers.Add(customer);
        dbContext.LaundryServices.Add(service);
        dbContext.LaundryOrders.Add(order);
        await dbContext.SaveChangesAsync();
    }

    private enum OrderSeedState
    {
        ConfirmedUnpaid,
        CompletedPaid,
        Rejected
    }
}
