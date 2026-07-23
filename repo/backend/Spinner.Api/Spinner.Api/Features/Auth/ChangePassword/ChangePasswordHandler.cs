using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Auth.ChangePassword;

public sealed class ChangePasswordHandler
    : IRequestHandler<ChangePasswordCommand, Result>
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;

    public ChangePasswordHandler(
        AppDbContext dbContext,
        IPasswordHasher passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task<Result> Handle(
        ChangePasswordCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _dbContext.StaffUsers.FirstOrDefaultAsync(
            candidate => candidate.Id == request.UserId,
            cancellationToken);

        if (user is null || !user.IsActive)
            return Result.Unauthorized("The owner account is unavailable.");

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            return Result.Validation("The current password is incorrect.");

        user.ChangePassword(
            _passwordHasher.Hash(request.NewPassword),
            DateTimeOffset.UtcNow);

        var activeSessions = await _dbContext.RefreshTokenSessions
            .Where(session =>
                session.UserId == user.Id &&
                session.RevokedAt == null)
            .ToListAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;
        foreach (var session in activeSessions)
            session.Revoke(now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result.NoContent();
    }
}
