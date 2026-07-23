using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.BusinessSettings;

namespace Spinner.Api.Features.Receipts.CreatePaymentInstructionMessage;

public sealed class CreatePaymentInstructionMessageHandler
    : IRequestHandler<CreatePaymentInstructionMessageQuery, Result<PaymentInstructionResponse>>
{
    private readonly AppDbContext _dbContext;

    public CreatePaymentInstructionMessageHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PaymentInstructionResponse>> Handle(
        CreatePaymentInstructionMessageQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<PaymentInstructionResponse>.NotFound("Order was not found.");

        if (order.PaymentStatus == PaymentStatus.Paid)
            return Result<PaymentInstructionResponse>.Conflict("Payment is already confirmed.");

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);
        var amount = order.EstimatedTotalAmount;
        var message = order.PaymentMethod switch
        {
            PaymentMethod.CashOnDelivery =>
                $"{settings.BusinessName}: Amount to pay for {order.OrderCode} is PHP {amount:N2}. Please pay on delivery or claim.",
            PaymentMethod.QrCodeOnlinePayment =>
                $"{settings.BusinessName}: Amount to pay for {order.OrderCode} is PHP {amount:N2}. QR online payment link will be sent when available.",
            _ => $"{settings.BusinessName}: Amount to pay for {order.OrderCode} is PHP {amount:N2}."
        };

        return Result<PaymentInstructionResponse>.Success(new PaymentInstructionResponse(
            order.Id,
            order.OrderCode,
            message,
            amount));
    }
}
