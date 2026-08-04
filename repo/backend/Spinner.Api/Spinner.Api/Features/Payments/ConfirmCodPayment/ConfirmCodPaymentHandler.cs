using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Features.ActivityLogs;
using Spinner.Api.Features.BusinessSettings;

namespace Spinner.Api.Features.Payments.ConfirmCodPayment;

public sealed class ConfirmCodPaymentHandler
    : IRequestHandler<ConfirmCodPaymentCommand, Result<PaymentConfirmationResponse>>
{
    private readonly AppDbContext _dbContext;

    public ConfirmCodPaymentHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PaymentConfirmationResponse>> Handle(
        ConfirmCodPaymentCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<PaymentConfirmationResponse>.NotFound("Order was not found.");

        var now = DateTimeOffset.UtcNow;
        var receiptCode = ReceiptCodeGenerator.NewReceiptCode(now);
        var payment = order.ConfirmCodPayment(receiptCode, now);

        if (!payment.IsSuccess)
            return Result<PaymentConfirmationResponse>.Conflict(payment.Error.Message);

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
            "CodPaymentConfirmed",
            $"COD payment was confirmed for order {order.OrderCode}.",
            now);

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Somebody else confirmed this payment first. Reported as a conflict rather
            // than an error, because nothing is wrong: the payment is recorded, and the
            // receipt they queued is the one the customer should get.
            return Result<PaymentConfirmationResponse>.Conflict(
                "This payment was just confirmed by someone else. Reload the order to see it.");
        }

        return Result<PaymentConfirmationResponse>.Success(PaymentConfirmationResponse.FromEntity(order));
    }
}
