using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Payments.CreateOnlinePaymentLink;

public sealed record CreateOnlinePaymentLinkCommand(Guid OrderId)
    : IRequest<Result<OnlinePaymentLinkResponse>>;
