using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Auth.RevokeAllSessions;

public sealed class RevokeAllSessionsHandler
    : IRequestHandler<RevokeAllSessionsCommand, Result>
{
    private readonly AppDbContext _dbContext;

    public RevokeAllSessionsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result> Handle(
        RevokeAllSessionsCommand request,
        CancellationToken cancellationToken)
    {
        var sessions = await _dbContext.RefreshTokenSessions
            .Where(candidate =>
                candidate.UserId == request.UserId &&
                candidate.RevokedAt == null)
            .ToListAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;

        foreach (var session in sessions)
            session.Revoke(now);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Result.NoContent();
    }
}
