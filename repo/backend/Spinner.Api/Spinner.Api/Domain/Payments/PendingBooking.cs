using Spinner.Api.Common.Results;

namespace Spinner.Api.Domain.Payments;

public enum PendingBookingStatus
{
    AwaitingPayment = 0,
    Paid = 1,
    Failed = 2,
    Expired = 3,
}

/// <summary>
/// A booking the customer has filled in but not yet paid for.
/// </summary>
/// <remarks>
/// QR orders are paid before they exist. Holding the booking here rather than
/// creating an unpaid order means an abandoned checkout never reaches the owner's
/// lists, so the shop cannot start work on laundry nobody paid for, and there is
/// no unpayable order left behind to tidy up.
///
/// This row is also the idempotency anchor. The provider's session id is unique,
/// and the order id is written in the same transaction that confirms payment, so a
/// retried webhook, a duplicated event, or a second tap on Pay resolves to the one
/// order that already exists instead of charging or creating another.
/// </remarks>
public sealed class PendingBooking
{
    private PendingBooking()
    {
    }

    public PendingBooking(
        string reference,
        string payloadJson,
        decimal amount,
        string currency,
        DateTimeOffset createdAt,
        DateTimeOffset expiresAt)
    {
        Id = Guid.NewGuid();
        Reference = reference.Trim();
        PayloadJson = payloadJson;
        Amount = amount;
        Currency = currency.Trim().ToUpperInvariant();
        Status = PendingBookingStatus.AwaitingPayment;
        CreatedAt = createdAt;
        ExpiresAt = expiresAt;
        UpdatedAt = createdAt;
    }

    public Guid Id { get; private set; }

    /// <summary>Our own reference, safe to show the customer and to put in a URL.</summary>
    public string Reference { get; private set; } = string.Empty;

    /// <summary>The provider's checkout session id. Unique, so events map to one booking.</summary>
    public string? CheckoutSessionId { get; private set; }

    public string? CheckoutUrl { get; private set; }

    /// <summary>The serialised booking request, replayed once payment is confirmed.</summary>
    public string PayloadJson { get; private set; } = string.Empty;

    /// <summary>
    /// A hash of the booking details, used to recognise the same booking being
    /// submitted twice so the customer is returned to the existing checkout rather
    /// than given a second one to pay.
    /// </summary>
    public string? PayloadFingerprint { get; private set; }

    public decimal Amount { get; private set; }

    public string Currency { get; private set; } = "PHP";

    public PendingBookingStatus Status { get; private set; }

    /// <summary>Set exactly once, when payment is confirmed and the order is created.</summary>
    public Guid? OrderId { get; private set; }

    public string? PaymentReference { get; private set; }

    public string? FailureReason { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? PaidAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public bool IsFulfilled => OrderId is not null;

    public bool HasExpired(DateTimeOffset now) =>
        Status == PendingBookingStatus.AwaitingPayment && now >= ExpiresAt;

    public void AttachCheckoutSession(
        string sessionId,
        string checkoutUrl,
        string fingerprint,
        DateTimeOffset now)
    {
        CheckoutSessionId = sessionId.Trim();
        CheckoutUrl = checkoutUrl.Trim();
        PayloadFingerprint = fingerprint;
        UpdatedAt = now;
    }

    /// <summary>
    /// Records that the provider confirmed payment. Safe to call again: a repeated
    /// event must not move a booking that has already produced an order.
    /// </summary>
    public Result MarkPaid(string paymentReference, DateTimeOffset now)
    {
        if (IsFulfilled)
            return Result.Success();

        if (Status is PendingBookingStatus.Failed or PendingBookingStatus.Expired)
        {
            // The customer paid after we gave up on the session. Accept it rather
            // than lose a real payment, and let the order be created.
            Status = PendingBookingStatus.AwaitingPayment;
        }

        Status = PendingBookingStatus.Paid;
        PaymentReference = paymentReference.Trim();
        PaidAt ??= now;
        UpdatedAt = now;

        return Result.Success();
    }

    public Result AttachOrder(Guid orderId, DateTimeOffset now)
    {
        if (IsFulfilled)
        {
            return OrderId == orderId
                ? Result.Success()
                : Result.Conflict("This payment has already produced a different order.");
        }

        if (Status != PendingBookingStatus.Paid)
            return Result.Conflict("A booking cannot be created before its payment is confirmed.");

        OrderId = orderId;
        UpdatedAt = now;

        return Result.Success();
    }

    public void MarkFailed(string reason, DateTimeOffset now)
    {
        if (IsFulfilled || Status == PendingBookingStatus.Paid)
            return;

        Status = PendingBookingStatus.Failed;
        FailureReason = reason.Trim();
        UpdatedAt = now;
    }

    public void MarkExpired(DateTimeOffset now)
    {
        if (IsFulfilled || Status == PendingBookingStatus.Paid)
            return;

        Status = PendingBookingStatus.Expired;
        UpdatedAt = now;
    }
}
