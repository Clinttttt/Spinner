using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;
using Spinner.Api.Domain.Users;

namespace Spinner.Api.Features.Auth.ResetPassword;

public sealed class ResetPasswordHandler
    : IRequestHandler<ResetPasswordCommand, Result>
{
    private const string InvalidCodeMessage =
        "The password reset code is invalid or expired.";

    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly AccountSecurityOptions _options;

    public ResetPasswordHandler(
        AppDbContext dbContext,
        IPasswordHasher passwordHasher,
        IOptions<AccountSecurityOptions> options)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _options = options.Value;
    }

    public async Task<Result> Handle(
        ResetPasswordCommand request,
        CancellationToken cancellationToken)
    {
        var rawLogin = request.Login.Trim();
        var normalizedLogin = rawLogin.ToLowerInvariant();
        var user = await _dbContext.StaffUsers.FirstOrDefaultAsync(
            candidate =>
                candidate.IsActive &&
                (candidate.EmailAddress == normalizedLogin ||
                 candidate.MobileNumber == rawLogin),
            cancellationToken);

        if (user is null)
            return Result.Validation(InvalidCodeMessage);

        var now = DateTimeOffset.UtcNow;
        var actionCode = await _dbContext.AccountActionCodes
            .Where(candidate =>
                candidate.UserId == user.Id &&
                candidate.Purpose == AccountActionPurpose.ResetPassword &&
                candidate.ConsumedAt == null)
            .OrderByDescending(candidate => candidate.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (actionCode is null ||
            !actionCode.CanAttempt(now, Math.Max(1, _options.MaxCodeAttempts)))
        {
            return Result.Validation(InvalidCodeMessage);
        }

        if (!_passwordHasher.Verify(request.Code.Trim(), actionCode.CodeHash))
        {
            actionCode.RecordFailedAttempt();
            await _dbContext.SaveChangesAsync(cancellationToken);
            return Result.Validation(InvalidCodeMessage);
        }

        actionCode.Consume(now);
        user.ChangePassword(_passwordHasher.Hash(request.NewPassword), now);

        var activeSessions = await _dbContext.RefreshTokenSessions
            .Where(session =>
                session.UserId == user.Id &&
                session.RevokedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var session in activeSessions)
            session.Revoke(now);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Result.NoContent();
    }
}
