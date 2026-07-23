using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Receipts.SendReceipt;

public sealed record SendReceiptCommand(Guid OrderId) : IRequest<Result<ReceiptNotificationResponse>>;
