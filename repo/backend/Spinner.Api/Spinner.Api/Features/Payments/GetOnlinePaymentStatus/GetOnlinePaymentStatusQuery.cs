using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Payments.GetOnlinePaymentStatus;

public sealed record GetOnlinePaymentStatusQuery(string PaymentReference)
    : IRequest<Result<OnlinePaymentStatusResponse>>;
