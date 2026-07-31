using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;
using Spinner.Api.Domain.Users;
using Spinner.Api.Features.Auth.Login;

namespace Spinner.Api.Features.Auth.VerifyEmail;

public sealed class VerifyEmailHandler
    : IRequestHandler<VerifyEmailCommand, Result<LoginResponse>>
{
    private const string InvalidCodeMessage =
        "The verification code is invalid or expired.";

    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IConfiguration _configuration;
    private readonly AccountSecurityOptions _options;

    public VerifyEmailHandler(
        AppDbContext dbContext,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService,
        IConfiguration configuration,
        IOptions<AccountSecurityOptions> options)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
        _configuration = configuration;
        _options = options.Value;
    }

    public async Task<Result<LoginResponse>> Handle(
        VerifyEmailCommand request,
        CancellationToken cancellationToken)
    {
        var emailAddress = request.EmailAddress.Trim().ToLowerInvariant();
        var user = await _dbContext.StaffUsers.FirstOrDefaultAsync(
            candidate =>
                candidate.EmailAddress == emailAddress &&
                candidate.IsActive,
            cancellationToken);

        if (user is null)
            return Result<LoginResponse>.Validation(InvalidCodeMessage);

        if (user.IsEmailVerified)
            return Result<LoginResponse>.Conflict(
                "This email address is already verified. Sign in instead.");

        var now = DateTimeOffset.UtcNow;
        var actionCode = await _dbContext.AccountActionCodes
            .Where(candidate =>
                candidate.UserId == user.Id &&
                candidate.Purpose == AccountActionPurpose.VerifyEmail &&
                candidate.ConsumedAt == null)
            .OrderByDescending(candidate => candidate.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (actionCode is null ||
            !actionCode.CanAttempt(now, Math.Max(1, _options.MaxCodeAttempts)))
        {
            return Result<LoginResponse>.Validation(InvalidCodeMessage);
        }

        if (!_passwordHasher.Verify(request.Code.Trim(), actionCode.CodeHash))
        {
            actionCode.RecordFailedAttempt();
            await _dbContext.SaveChangesAsync(cancellationToken);
            return Result<LoginResponse>.Validation(InvalidCodeMessage);
        }

        actionCode.Consume(now);
        user.VerifyEmail(now);

        var accessToken = _jwtTokenService.CreateToken(user);
        var generatedRefreshToken = _refreshTokenService.Generate();
        var refreshTokenExpiresAt = now.AddDays(
            _configuration.GetValue("Jwt:RefreshTokenDays", 30));

        _dbContext.RefreshTokenSessions.Add(new RefreshTokenSession(
            user.Id,
            generatedRefreshToken.TokenHash,
            Guid.NewGuid(),
            refreshTokenExpiresAt,
            now));
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<LoginResponse>.Success(new LoginResponse(
            accessToken.Token,
            accessToken.ExpiresAt,
            generatedRefreshToken.Token,
            refreshTokenExpiresAt,
            user.Id,
            user.FullName,
            user.EmailAddress,
            user.Role));
    }
}
