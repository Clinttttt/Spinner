using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Payments.GetOnlinePaymentStatus;

public sealed class GetOnlinePaymentStatusHandler
    : IRequestHandler<GetOnlinePaymentStatusQuery, Result<OnlinePaymentStatusResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetOnlinePaymentStatusHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<OnlinePaymentStatusResponse>> Handle(
        GetOnlinePaymentStatusQuery request,
        CancellationToken cancellationToken)
    {
        var reference = request.PaymentReference.Trim();
        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .FirstOrDefaultAsync(order => order.OnlinePaymentReference == reference, cancellationToken);

        if (order is null)
            return Result<OnlinePaymentStatusResponse>.NotFound("Online payment reference was not found.");

        return Result<OnlinePaymentStatusResponse>.Success(new OnlinePaymentStatusResponse(
            reference,
            order.OrderCode,
            order.PaymentStatus,
            order.EstimatedTotalAmount,
            order.PaidAt,
            order.ReceiptCode));
    }
}
