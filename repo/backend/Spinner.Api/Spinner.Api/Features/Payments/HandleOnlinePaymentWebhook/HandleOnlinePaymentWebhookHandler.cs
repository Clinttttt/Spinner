using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.ActivityLogs;
using Spinner.Api.Features.BusinessSettings;
using Spinner.Api.Integrations.OnlinePayments;

namespace Spinner.Api.Features.Payments.HandleOnlinePaymentWebhook;

public sealed class HandleOnlinePaymentWebhookHandler
    : IRequestHandler<HandleOnlinePaymentWebhookCommand, Result<OnlinePaymentWebhookResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly OnlinePaymentSignatureVerifier _signatureVerifier;
    private readonly OnlinePaymentOptions _options;
    private readonly ILogger<HandleOnlinePaymentWebhookHandler> _logger;

    public HandleOnlinePaymentWebhookHandler(
        AppDbContext dbContext,
        OnlinePaymentSignatureVerifier signatureVerifier,
        IOptions<OnlinePaymentOptions> options,
        ILogger<HandleOnlinePaymentWebhookHandler> logger)
    {
        _dbContext = dbContext;
        _signatureVerifier = signatureVerifier;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<Result<OnlinePaymentWebhookResponse>> Handle(
        HandleOnlinePaymentWebhookCommand request,
        CancellationToken cancellationToken)
    {
        // The gateway is PayMongo, and it posts to the paymongo/webhook route instead. This
        // one could still mark any QR order paid on nothing more than a shared secret held
        // in configuration, so it is closed unless deliberately switched on. Logged rather
        // than silently dropped: if a caller nobody remembers is still using it, that should
        // surface as a warning here, not as payments that stop being recorded.
        if (!_options.EnableLegacyWebhook)
        {
            _logger.LogWarning(
                "The legacy self-signed payment webhook was called for reference {PaymentReference} while disabled. Payment was not settled. Set OnlinePayments:EnableLegacyWebhook to true only if this caller is expected.",
                request.PaymentReference);

            return Result<OnlinePaymentWebhookResponse>.NotFound(
                "This payment webhook is no longer in service.");
        }

        if (!_signatureVerifier.Verify(request.PaymentReference, request.Amount, request.Status, request.Signature))
            return Result<OnlinePaymentWebhookResponse>.Unauthorized("Online payment webhook signature is invalid.");

        if (!string.Equals(request.Status.Trim(), "paid", StringComparison.OrdinalIgnoreCase))
            return Result<OnlinePaymentWebhookResponse>.Conflict("Only paid online payment events can confirm payment.");

        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(
                order => order.OnlinePaymentReference == request.PaymentReference.Trim(),
                cancellationToken);

        if (order is null)
            return Result<OnlinePaymentWebhookResponse>.NotFound("Online payment reference was not found.");

        if (order.PaymentStatus == PaymentStatus.Paid)
        {
            return Result<OnlinePaymentWebhookResponse>.Success(new OnlinePaymentWebhookResponse(
                request.PaymentReference.Trim(),
                order.OrderCode,
                order.PaymentStatus,
                order.ReceiptCode));
        }

        var now = DateTimeOffset.UtcNow;
        var receiptCode = ReceiptCodeGenerator.NewReceiptCode(now);
        var payment = order.ConfirmOnlinePayment(request.PaymentReference, request.Amount, receiptCode, now);

        if (!payment.IsSuccess)
            return Result<OnlinePaymentWebhookResponse>.Conflict(payment.Error.Message);

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);
        PaymentReceiptNotificationQueue.QueueReceiptNotifications(
            _dbContext,
            order,
            settings.BusinessName,
            settings.IsEmailReceiptEnabled,
            now);

        ActivityLogRecorder.RecordOrderActivity(
            _dbContext,
            order,
            "OnlinePaymentConfirmed",
            $"Online payment was confirmed for order {order.OrderCode}.",
            now,
            actor: "system");

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<OnlinePaymentWebhookResponse>.Success(new OnlinePaymentWebhookResponse(
            request.PaymentReference.Trim(),
            order.OrderCode,
            order.PaymentStatus,
            order.ReceiptCode));
    }
}
