using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Receipts.CreatePaymentInstructionMessage;

public sealed record CreatePaymentInstructionMessageQuery(Guid OrderId)
    : IRequest<Result<PaymentInstructionResponse>>;
