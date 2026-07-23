using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Auth.RevokeSession;

public sealed record RevokeSessionCommand(string RefreshToken)
    : IRequest<Result>;
