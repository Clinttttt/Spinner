using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Payments.HandleOnlinePaymentWebhook;

public sealed record HandleOnlinePaymentWebhookCommand(
    string PaymentReference,
    decimal Amount,
    string Status,
    string Signature) : IRequest<Result<OnlinePaymentWebhookResponse>>;
