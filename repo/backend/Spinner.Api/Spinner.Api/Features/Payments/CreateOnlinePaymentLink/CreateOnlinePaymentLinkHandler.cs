using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.ActivityLogs;
using Spinner.Api.Features.BusinessSettings;
using Spinner.Api.Integrations.OnlinePayments;

namespace Spinner.Api.Features.Payments.CreateOnlinePaymentLink;

public sealed class CreateOnlinePaymentLinkHandler
    : IRequestHandler<CreateOnlinePaymentLinkCommand, Result<OnlinePaymentLinkResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly OnlinePaymentOptions _options;

    public CreateOnlinePaymentLinkHandler(
        AppDbContext dbContext,
        IOptions<OnlinePaymentOptions> options)
    {
        _dbContext = dbContext;
        _options = options.Value;
    }

    public async Task<Result<OnlinePaymentLinkResponse>> Handle(
        CreateOnlinePaymentLinkCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .FirstOrDefaultAsync(order => order.Id == request.OrderId, cancellationToken);

        if (order is null)
            return Result<OnlinePaymentLinkResponse>.NotFound("Order was not found.");

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        if (!settings.IsQrCodeOnlinePaymentEnabled)
            return Result<OnlinePaymentLinkResponse>.Conflict("QR Code Online Payment is not enabled.");

        if (order.PaymentMethod != PaymentMethod.QrCodeOnlinePayment)
            return Result<OnlinePaymentLinkResponse>.Conflict("Only QR Code Online Payment orders can receive an online payment link.");

        if (!string.IsNullOrWhiteSpace(order.OnlinePaymentReference) &&
            !string.IsNullOrWhiteSpace(order.OnlinePaymentCheckoutUrl))
        {
            return Result<OnlinePaymentLinkResponse>.Success(new OnlinePaymentLinkResponse(
                order.Id,
                order.OrderCode,
                order.PaymentMethod,
                order.PaymentStatus,
                order.OnlinePaymentReference,
                order.OnlinePaymentCheckoutUrl,
                order.EstimatedTotalAmount));
        }

        var now = DateTimeOffset.UtcNow;
        var reference = OnlinePaymentReferenceGenerator.NewReference(now);
        var checkoutUrl = $"{_options.PublicPaymentBaseUrl.TrimEnd('/')}/{reference}";
        var link = order.CreateOnlinePaymentLink(reference, checkoutUrl, now);

        if (!link.IsSuccess)
            return Result<OnlinePaymentLinkResponse>.Conflict(link.Error.Message);

        ActivityLogRecorder.RecordOrderActivity(
            _dbContext,
            order,
            "OnlinePaymentLinkCreated",
            $"Online payment link was created for order {order.OrderCode}.",
            now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<OnlinePaymentLinkResponse>.Success(new OnlinePaymentLinkResponse(
            order.Id,
            order.OrderCode,
            order.PaymentMethod,
            order.PaymentStatus,
            reference,
            checkoutUrl,
            order.EstimatedTotalAmount));
    }
}
