using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Receipts.GetReceipt;

public sealed class GetReceiptHandler : IRequestHandler<GetReceiptQuery, Result<ReceiptResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetReceiptHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<ReceiptResponse>> Handle(
        GetReceiptQuery request,
        CancellationToken cancellationToken)
    {
        var receiptCode = request.ReceiptCode.Trim();
        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(order => order.ReceiptCode == receiptCode, cancellationToken);

        if (order is null || order.PaymentStatus != PaymentStatus.Paid)
            return Result<ReceiptResponse>.NotFound("Receipt was not found.");

        return Result<ReceiptResponse>.Success(ReceiptResponse.FromEntity(order));
    }
}
