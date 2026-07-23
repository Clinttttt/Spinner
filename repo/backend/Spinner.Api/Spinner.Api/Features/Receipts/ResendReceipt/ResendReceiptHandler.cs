using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.BusinessSettings;

namespace Spinner.Api.Features.Receipts.ResendReceipt;

public sealed class ResendReceiptHandler : IRequestHandler<ResendReceiptCommand, Result<ReceiptNotificationResponse>>
{
    private readonly AppDbContext _dbContext;

    public ResendReceiptHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<ReceiptNotificationResponse>> Handle(
        ResendReceiptCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<ReceiptNotificationResponse>.NotFound("Order was not found.");

        if (order.PaymentStatus != PaymentStatus.Paid || string.IsNullOrWhiteSpace(order.ReceiptCode))
            return Result<ReceiptNotificationResponse>.Conflict("Receipt can only be resent after payment is confirmed.");

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);
        var response = ReceiptNotificationQueue.QueueReceipt(
            _dbContext,
            order,
            settings.BusinessName,
            settings.IsEmailReceiptEnabled,
            DateTimeOffset.UtcNow);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<ReceiptNotificationResponse>.Success(response);
    }
}
