using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Receipts.GetReceipt;

public sealed record GetReceiptQuery(string ReceiptCode) : IRequest<Result<ReceiptResponse>>;
