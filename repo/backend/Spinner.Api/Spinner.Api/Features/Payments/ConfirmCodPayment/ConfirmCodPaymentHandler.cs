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

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<PaymentConfirmationResponse>.Success(PaymentConfirmationResponse.FromEntity(order));
    }
}
