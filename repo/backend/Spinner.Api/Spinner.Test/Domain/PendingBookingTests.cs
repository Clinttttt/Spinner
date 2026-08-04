using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Payments;

namespace Spinner.Test.Domain;

/// <summary>
/// This record is what stops a paid customer being charged twice or booked twice.
/// The provider retries deliveries, fires more than one event for a single payment,
/// and the customer's own return page asks for the same work, so every transition
/// has to survive being repeated.
/// </summary>
public sealed class PendingBookingTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 4, 6, 0, 0, TimeSpan.Zero);

    private static PendingBooking Create(int minutesToLive = 60) =>
        new("PAY-20260804-ABCDEFGHJK", "{}", 400m, "PHP", Now, Now.AddMinutes(minutesToLive));

    [Fact]
    public void Should_Start_Awaiting_Payment_And_Unfulfilled()
    {
        var pending = Create();

        Assert.Equal(PendingBookingStatus.AwaitingPayment, pending.Status);
        Assert.False(pending.IsFulfilled);
        Assert.Null(pending.OrderId);
        Assert.Equal("PHP", pending.Currency);
    }

    [Fact]
    public void Should_Refuse_To_Attach_An_Order_Before_Payment()
    {
        var pending = Create();

        var result = pending.AttachOrder(Guid.NewGuid(), Now);

        // Creating the job before the money arrives is the thing being prevented.
        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
        Assert.Null(pending.OrderId);
    }

    [Fact]
    public void Should_Record_The_First_Payment_Time_And_Keep_It_On_Repeats()
    {
        var pending = Create();

        pending.MarkPaid("pay_1", Now);
        var firstPaidAt = pending.PaidAt;
        pending.MarkPaid("pay_1", Now.AddMinutes(5));

        Assert.Equal(PendingBookingStatus.Paid, pending.Status);
        // Duplicate events must not keep moving the payment time.
        Assert.Equal(firstPaidAt, pending.PaidAt);
    }

    [Fact]
    public void Should_Treat_Attaching_The_Same_Order_Twice_As_Done()
    {
        var pending = Create();
        var orderId = Guid.NewGuid();
        pending.MarkPaid("pay_1", Now);

        Assert.True(pending.AttachOrder(orderId, Now).IsSuccess);
        // A retried webhook and the customer's return page can both get here.
        Assert.True(pending.AttachOrder(orderId, Now).IsSuccess);
        Assert.Equal(orderId, pending.OrderId);
    }

    [Fact]
    public void Should_Refuse_To_Point_One_Payment_At_A_Second_Order()
    {
        var pending = Create();
        var first = Guid.NewGuid();
        pending.MarkPaid("pay_1", Now);
        pending.AttachOrder(first, Now);

        var result = pending.AttachOrder(Guid.NewGuid(), Now);

        // One payment, one job. Silently accepting would double the work.
        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
        Assert.Equal(first, pending.OrderId);
    }

    [Fact]
    public void Should_Accept_A_Payment_That_Arrives_After_The_Session_Was_Given_Up_On()
    {
        var pending = Create();
        pending.MarkFailed("card declined", Now);

        pending.MarkPaid("pay_late", Now.AddMinutes(2));

        // Losing a real payment because we had already written the attempt off
        // would be far worse than reviving it.
        Assert.Equal(PendingBookingStatus.Paid, pending.Status);
        Assert.True(pending.AttachOrder(Guid.NewGuid(), Now.AddMinutes(2)).IsSuccess);
    }

    [Fact]
    public void Should_Not_Let_A_Failure_Or_Expiry_Undo_A_Payment()
    {
        var pending = Create();
        pending.MarkPaid("pay_1", Now);

        pending.MarkFailed("late failure event", Now.AddMinutes(1));
        pending.MarkExpired(Now.AddMinutes(2));

        Assert.Equal(PendingBookingStatus.Paid, pending.Status);
    }

    [Fact]
    public void Should_Not_Reopen_A_Booking_That_Already_Produced_An_Order()
    {
        var pending = Create();
        pending.MarkPaid("pay_1", Now);
        pending.AttachOrder(Guid.NewGuid(), Now);

        pending.MarkFailed("stray event", Now.AddMinutes(1));
        pending.MarkExpired(Now.AddMinutes(2));

        Assert.Equal(PendingBookingStatus.Paid, pending.Status);
        Assert.True(pending.IsFulfilled);
    }

    [Fact]
    public void Should_Only_Expire_While_Still_Awaiting_Payment()
    {
        var pending = Create(minutesToLive: 30);

        Assert.False(pending.HasExpired(Now.AddMinutes(29)));
        Assert.True(pending.HasExpired(Now.AddMinutes(30)));

        pending.MarkPaid("pay_1", Now);
        Assert.False(pending.HasExpired(Now.AddHours(5)));
    }

    [Fact]
    public void Should_Remember_The_Provider_Session_For_Matching_Events()
    {
        var pending = Create();

        pending.AttachCheckoutSession("cs_abc", "https://checkout.test/abc", "fingerprint", Now);

        // Events arrive keyed by the provider's session, so this is the link back.
        Assert.Equal("cs_abc", pending.CheckoutSessionId);
        Assert.Equal("https://checkout.test/abc", pending.CheckoutUrl);
        Assert.Equal("fingerprint", pending.PayloadFingerprint);
    }
}
