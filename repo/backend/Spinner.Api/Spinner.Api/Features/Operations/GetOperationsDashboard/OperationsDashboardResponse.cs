namespace Spinner.Api.Features.Operations.GetOperationsDashboard;

public sealed record OperationsDashboardResponse(
    int NewBookings,
    int ForPickup,
    int BeingProcessed,
    int ReadyForDelivery,
    int UnpaidOrders,
    int CompletedToday,
    decimal SalesToday,
    /// <summary>
    /// How many rows the transaction history holds, so the app can badge that tab when
    /// money actually moves.
    /// </summary>
    /// <remarks>
    /// The app previously badged the history tab with <see cref="UnpaidOrders"/>, which
    /// counted something that page does not list: an unpaid booking is not a transaction.
    /// A new booking therefore raised a badge on a screen where nothing had appeared.
    /// </remarks>
    int TransactionCount);
