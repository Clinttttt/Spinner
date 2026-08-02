using Spinner.Api.Common.Results;

namespace Spinner.Api.Integrations.OnlinePayments;

/// <summary>One line shown to the customer on the provider's checkout page.</summary>
public sealed record CheckoutLineItem(string Name, string? Description, int Quantity, decimal UnitAmount);

public sealed record CheckoutSessionRequest(
    string Reference,
    string Description,
    IReadOnlyList<CheckoutLineItem> Items,
    decimal TotalAmount,
    string CustomerName,
    string MobileNumber,
    string? EmailAddress,
    string SuccessUrl,
    string CancelUrl);

public sealed record CheckoutSessionResult(string SessionId, string CheckoutUrl);

/// <summary>
/// Creates a hosted checkout the customer pays before their booking exists.
/// </summary>
/// <remarks>
/// Behind an interface so the provider can be swapped, and so the shop can run
/// with online payment switched off entirely: an unconfigured deployment refuses
/// the checkout with a clear message instead of failing somewhere deeper.
/// </remarks>
public interface IPaymentCheckoutGateway
{
    /// <summary>True when the deployment has credentials to take payments.</summary>
    bool IsConfigured { get; }

    Task<Result<CheckoutSessionResult>> CreateSessionAsync(
        CheckoutSessionRequest request,
        CancellationToken cancellationToken);
}
