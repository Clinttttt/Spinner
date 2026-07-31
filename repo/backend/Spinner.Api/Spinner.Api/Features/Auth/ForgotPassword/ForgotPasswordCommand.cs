using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Auth.ForgotPassword;

public sealed record ForgotPasswordCommand(
    string Login) : IRequest<Result<AccountCodeDeliveryResponse>>;
