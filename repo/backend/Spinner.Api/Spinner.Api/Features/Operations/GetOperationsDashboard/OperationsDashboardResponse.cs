namespace Spinner.Api.Features.Operations.GetOperationsDashboard;

public sealed record OperationsDashboardResponse(
    int NewBookings,
    int ForPickup,
    int BeingProcessed,
    int ReadyForDelivery,
    int UnpaidOrders,
    int CompletedToday,
    decimal SalesToday);
