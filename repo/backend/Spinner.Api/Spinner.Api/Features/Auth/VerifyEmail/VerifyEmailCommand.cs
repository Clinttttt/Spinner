using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Auth.Login;

namespace Spinner.Api.Features.Auth.VerifyEmail;

public sealed record VerifyEmailCommand(
    string EmailAddress,
    string Code) : IRequest<Result<LoginResponse>>;
