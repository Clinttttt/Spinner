using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Receipts.ResendReceipt;

public sealed record ResendReceiptCommand(Guid OrderId) : IRequest<Result<ReceiptNotificationResponse>>;
