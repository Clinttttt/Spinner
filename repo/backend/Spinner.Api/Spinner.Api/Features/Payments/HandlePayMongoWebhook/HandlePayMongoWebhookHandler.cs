using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Time;
using Spinner.Api.Database;
using Spinner.Api.Domain.Payments;
using Spinner.Api.Integrations.OnlinePayments;

namespace Spinner.Api.Features.Payments.HandlePayMongoWebhook;

/// <summary>
/// The only route by which a QR booking becomes paid.
/// </summary>
/// <remarks>
/// Staff cannot mark QR orders paid by hand, so this endpoint is what moves money
/// into the system. It refuses anything it cannot prove came from PayMongo.
///
/// Events for other integrations on the same PayMongo account also arrive here.
/// Those are acknowledged and ignored: returning an error would make PayMongo retry
/// something that is not ours to handle.
/// </remarks>
public sealed class HandlePayMongoWebhookHandler
    : IRequestHandler<HandlePayMongoWebhookCommand, Result<PayMongoWebhookResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly PayMongoWebhookSignatureVerifier _verifier;
    private readonly PaidBookingFinaliser _finaliser;
    private readonly IBusinessClock _clock;
    private readonly ILogger<HandlePayMongoWebhookHandler> _logger;

    public HandlePayMongoWebhookHandler(
        AppDbContext dbContext,
        PayMongoWebhookSignatureVerifier verifier,
        PaidBookingFinaliser finaliser,
        IBusinessClock clock,
        ILogger<HandlePayMongoWebhookHandler> logger)
    {
        _dbContext = dbContext;
        _verifier = verifier;
        _finaliser = finaliser;
        _clock = clock;
        _logger = logger;
    }

    public async Task<Result<PayMongoWebhookResponse>> Handle(
        HandlePayMongoWebhookCommand request,
        CancellationToken cancellationToken)
    {
        var now = _clock.Now;

        if (!_verifier.Verify(request.RawBody, request.Signature, now))
        {
            _logger.LogWarning(
                "Rejected a PayMongo webhook with a missing or invalid signature. {Diagnostic}",
                _verifier.Describe(request.Signature, request.RawBody));
            return Result<PayMongoWebhookResponse>.Unauthorized("The webhook signature could not be verified.");
        }

        if (!TryReadEvent(request.RawBody, out var eventType, out var sessionId, out var reference))
            return Result<PayMongoWebhookResponse>.Success(new PayMongoWebhookResponse("ignored.unreadable", null));

        var pending = await FindPendingAsync(sessionId, reference, cancellationToken);

        if (pending is null)
        {
            // Almost always an event belonging to another integration on the same
            // account. Acknowledge so it is not retried forever.
            _logger.LogInformation(
                "PayMongo event {EventType} did not match a pending booking; acknowledged.", eventType);
            return Result<PayMongoWebhookResponse>.Success(new PayMongoWebhookResponse("ignored.unknown", null));
        }

        switch (eventType)
        {
            case "checkout_session.payment.paid":
            case "payment.paid":
                return await MarkPaidAsync(pending, now, cancellationToken);

            case "payment.failed":
                pending.MarkFailed("The payment did not go through.", now);
                await _dbContext.SaveChangesAsync(cancellationToken);
                return Result<PayMongoWebhookResponse>.Success(new PayMongoWebhookResponse("payment.failed", null));

            default:
                return Result<PayMongoWebhookResponse>.Success(
                    new PayMongoWebhookResponse($"ignored.{eventType}", null));
        }
    }

    private async Task<Result<PayMongoWebhookResponse>> MarkPaidAsync(
        PendingBooking pending,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (pending.OrderId is not null)
        {
            // A repeat of an event already handled.
            var existing = await _dbContext.LaundryOrders
                .Where(order => order.Id == pending.OrderId)
                .Select(order => order.OrderCode)
                .FirstOrDefaultAsync(cancellationToken);

            return Result<PayMongoWebhookResponse>.Success(
                new PayMongoWebhookResponse("already.fulfilled", existing));
        }

        pending.MarkPaid(pending.CheckoutSessionId ?? pending.Reference, now);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var finalised = await _finaliser.FinaliseAsync(pending, now, cancellationToken);

        if (!finalised.IsSuccess)
        {
            // The payment is recorded, so PayMongo must not be told this failed in a
            // way that loses it. The customer's return page retries the same step.
            _logger.LogError(
                "Paid booking {Reference} is awaiting order creation: {Error}",
                pending.Reference,
                finalised.Error.Message);

            return Result<PayMongoWebhookResponse>.Success(
                new PayMongoWebhookResponse("paid.pending_order", null));
        }

        var orderCode = await _dbContext.LaundryOrders
            .Where(order => order.Id == finalised.Value)
            .Select(order => order.OrderCode)
            .FirstOrDefaultAsync(cancellationToken);

        return Result<PayMongoWebhookResponse>.Success(new PayMongoWebhookResponse("paid.fulfilled", orderCode));
    }

    private async Task<PendingBooking?> FindPendingAsync(
        string? sessionId,
        string? reference,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            var bySession = await _dbContext.PendingBookings
                .FirstOrDefaultAsync(item => item.CheckoutSessionId == sessionId, cancellationToken);

            if (bySession is not null) return bySession;
        }

        if (!string.IsNullOrWhiteSpace(reference))
        {
            return await _dbContext.PendingBookings
                .FirstOrDefaultAsync(item => item.Reference == reference, cancellationToken);
        }

        return null;
    }

    /// <summary>
    /// Pulls the event type and the identifiers out of PayMongo's envelope.
    /// </summary>
    /// <remarks>
    /// The shape differs between events: a checkout session event carries the session
    /// as the resource, while a payment event carries the payment and refers to the
    /// session inside its own attributes. Both are searched, along with the reference
    /// number we supplied, so a booking is still found if one of them is absent.
    /// </remarks>
    private static bool TryReadEvent(
        string rawBody,
        out string eventType,
        out string? sessionId,
        out string? reference)
    {
        eventType = string.Empty;
        sessionId = null;
        reference = null;

        try
        {
            using var document = JsonDocument.Parse(rawBody);

            if (!document.RootElement.TryGetProperty("data", out var envelope)) return false;
            if (!envelope.TryGetProperty("attributes", out var envelopeAttributes)) return false;

            eventType = envelopeAttributes.TryGetProperty("type", out var type)
                ? type.GetString() ?? string.Empty
                : string.Empty;

            if (!envelopeAttributes.TryGetProperty("data", out var resource)) return eventType.Length > 0;

            var resourceType = resource.TryGetProperty("type", out var kind) ? kind.GetString() : null;
            var resourceId = resource.TryGetProperty("id", out var id) ? id.GetString() : null;

            if (string.Equals(resourceType, "checkout_session", StringComparison.Ordinal))
                sessionId = resourceId;

            if (resource.TryGetProperty("attributes", out var attributes))
            {
                if (attributes.TryGetProperty("reference_number", out var referenceNumber))
                    reference = referenceNumber.GetString();

                if (sessionId is null &&
                    attributes.TryGetProperty("checkout_session_id", out var linkedSession))
                {
                    sessionId = linkedSession.GetString();
                }

                // A payment event nests the description and reference under its own
                // attributes; the reference number is the reliable link back.
                if (reference is null &&
                    attributes.TryGetProperty("external_reference_number", out var external))
                {
                    reference = external.GetString();
                }
            }

            return eventType.Length > 0;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
