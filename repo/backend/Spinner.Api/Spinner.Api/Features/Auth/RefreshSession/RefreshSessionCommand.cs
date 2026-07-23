using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Auth.Login;

namespace Spinner.Api.Features.Auth.RefreshSession;

public sealed record RefreshSessionCommand(string RefreshToken)
    : IRequest<Result<LoginResponse>>;
