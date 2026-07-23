using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Payments.ConfirmCodPayment;

public sealed record ConfirmCodPaymentCommand(Guid OrderId) : IRequest<Result<PaymentConfirmationResponse>>;
