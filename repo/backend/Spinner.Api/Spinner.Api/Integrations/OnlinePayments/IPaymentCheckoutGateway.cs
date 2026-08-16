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
    string CancelUrl,
    /// <summary>
    /// What the shop should be called on the customer's statement.
    /// </summary>
    /// <remarks>
    /// Sent because PayMongo falls back to the account's own business name when this is absent.
    /// Where one PayMongo account serves more than one business, that default is the other
    /// business's name — which is how a laundry payment came to be labelled with an unrelated
    /// trade name.
    ///
    /// Worth knowing: this governs the statement descriptor, not the merchant identity that a
    /// wallet shows on its own receipt. That name comes from the PayMongo account's registered
    /// business and cannot be set per payment.
    /// </remarks>
    string? StatementDescriptor = null,
    /// <summary>
    /// Image shown beside each line on the hosted checkout page.
    /// </summary>
    /// <remarks>
    /// Without one, PayMongo draws a large grey tile containing the first letter of the line's
    /// name, which is what made the checkout look unfinished. Must be a publicly fetchable
    /// absolute URL: the page is rendered by PayMongo, not by us.
    /// </remarks>
    string? LineItemImageUrl = null);

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
