namespace Spinner.Api.Features.Reports.GetDailySalesReport;

public sealed record DailySalesReportResponse(
    DateOnly Date,
    int TotalOrders,
    int CompletedOrders,
    int PendingOrders,
    int RejectedOrders,
    decimal GrossSales,
    decimal CashSales,
    decimal OnlinePaymentSales,
    decimal UnpaidAmount,
    int PickupAndDeliveryOrders,
    string? TopServiceName,
    int TopServiceOrderCount);
