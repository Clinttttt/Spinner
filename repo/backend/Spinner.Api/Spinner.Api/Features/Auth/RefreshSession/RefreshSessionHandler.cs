using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Auth.Login;

namespace Spinner.Api.Features.Auth.RefreshSession;

public sealed class RefreshSessionHandler
    : IRequestHandler<RefreshSessionCommand, Result<LoginResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IConfiguration _configuration;

    public RefreshSessionHandler(
        AppDbContext dbContext,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
        _configuration = configuration;
    }

    public async Task<Result<LoginResponse>> Handle(
        RefreshSessionCommand request,
        CancellationToken cancellationToken)
    {
        var tokenHash = _refreshTokenService.Hash(request.RefreshToken);
        var session = await _dbContext.RefreshTokenSessions
            .Include(candidate => candidate.User)
            .FirstOrDefaultAsync(
                candidate => candidate.TokenHash == tokenHash,
                cancellationToken);

        if (session is null)
            return Result<LoginResponse>.Unauthorized("The refresh token is invalid.");

        var now = DateTimeOffset.UtcNow;

        if (session.RevokedAt is not null)
        {
            await RevokeFamilyAsync(session.FamilyId, now, cancellationToken);
            return Result<LoginResponse>.Unauthorized(
                "Refresh token reuse was detected. Sign in again.");
        }

        if (!session.IsActive(now) || !session.User.IsActive)
        {
            session.Revoke(now);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return Result<LoginResponse>.Unauthorized(
                "The session has expired or is unavailable.");
        }

        var generatedRefreshToken = _refreshTokenService.Generate();
        var refreshTokenExpiresAt = now.AddDays(
            _configuration.GetValue("Jwt:RefreshTokenDays", 30));
        var replacement = new RefreshTokenSession(
            session.UserId,
            generatedRefreshToken.TokenHash,
            session.FamilyId,
            refreshTokenExpiresAt,
            now);

        session.Revoke(now, replacement.Id);
        _dbContext.RefreshTokenSessions.Add(replacement);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var accessToken = _jwtTokenService.CreateToken(session.User);
        return Result<LoginResponse>.Success(new LoginResponse(
            accessToken.Token,
            accessToken.ExpiresAt,
            generatedRefreshToken.Token,
            refreshTokenExpiresAt,
            session.User.Id,
            session.User.FullName,
            session.User.EmailAddress,
            session.User.Role));
    }

    private async Task RevokeFamilyAsync(
        Guid familyId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var activeFamilySessions = await _dbContext.RefreshTokenSessions
            .Where(candidate =>
                candidate.FamilyId == familyId &&
                candidate.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var activeSession in activeFamilySessions)
            activeSession.Revoke(now);

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
