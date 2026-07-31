using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Auth.ResendVerification;

public sealed record ResendVerificationCommand(
    string EmailAddress) : IRequest<Result<AccountCodeDeliveryResponse>>;
