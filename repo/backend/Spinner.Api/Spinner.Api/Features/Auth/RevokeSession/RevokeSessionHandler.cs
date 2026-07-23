using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Auth.RevokeSession;

public sealed class RevokeSessionHandler
    : IRequestHandler<RevokeSessionCommand, Result>
{
    private readonly AppDbContext _dbContext;
    private readonly IRefreshTokenService _refreshTokenService;

    public RevokeSessionHandler(
        AppDbContext dbContext,
        IRefreshTokenService refreshTokenService)
    {
        _dbContext = dbContext;
        _refreshTokenService = refreshTokenService;
    }

    public async Task<Result> Handle(
        RevokeSessionCommand request,
        CancellationToken cancellationToken)
    {
        var tokenHash = _refreshTokenService.Hash(request.RefreshToken);
        var session = await _dbContext.RefreshTokenSessions.FirstOrDefaultAsync(
            candidate => candidate.TokenHash == tokenHash,
            cancellationToken);

        if (session is not null)
        {
            session.Revoke(DateTimeOffset.UtcNow);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return Result.NoContent();
    }
}
