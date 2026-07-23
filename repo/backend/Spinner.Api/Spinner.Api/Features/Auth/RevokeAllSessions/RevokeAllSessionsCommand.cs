using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Auth.RevokeAllSessions;

public sealed record RevokeAllSessionsCommand(Guid UserId)
    : IRequest<Result>;
