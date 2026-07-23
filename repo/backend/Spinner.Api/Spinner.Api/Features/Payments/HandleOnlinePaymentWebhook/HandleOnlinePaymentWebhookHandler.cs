using MediatR;
using Microsoft.EntityFrameworkCore;
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

    public HandleOnlinePaymentWebhookHandler(
        AppDbContext dbContext,
        OnlinePaymentSignatureVerifier signatureVerifier)
    {
        _dbContext = dbContext;
        _signatureVerifier = signatureVerifier;
    }

    public async Task<Result<OnlinePaymentWebhookResponse>> Handle(
        HandleOnlinePaymentWebhookCommand request,
        CancellationToken cancellationToken)
    {
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
