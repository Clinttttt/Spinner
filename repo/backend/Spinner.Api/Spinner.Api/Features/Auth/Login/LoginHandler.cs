using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;
using Spinner.Api.Domain.Users;
using Microsoft.Extensions.Options;

namespace Spinner.Api.Features.Auth.Login;

public sealed class LoginHandler : IRequestHandler<LoginCommand, Result<LoginResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IConfiguration _configuration;
    private readonly AccountSecurityOptions _options;

    public LoginHandler(
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

    public async Task<Result<LoginResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var login = request.Login.Trim().ToLowerInvariant();
        var user = await _dbContext.StaffUsers.FirstOrDefaultAsync(
            user => user.EmailAddress == login || user.MobileNumber == request.Login.Trim(),
            cancellationToken);

        var now = DateTimeOffset.UtcNow;

        if (user is null)
            return Result<LoginResponse>.Unauthorized("Invalid login credentials.");

        // Checked before the password so a locked account cannot be probed further,
        // and reported plainly: hiding it would just look like the password stopped
        // working for no reason.
        if (user.IsLockedOut(now))
        {
            return Result<LoginResponse>.Unauthorized(
                "Too many failed sign-in attempts. Please try again in a few minutes.");
        }

        if (!user.IsActive || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            user.RecordFailedLogin(
                now,
                Math.Max(1, _options.MaxFailedLoginAttempts),
                Math.Max(1, _options.LoginLockoutMinutes));

            await _dbContext.SaveChangesAsync(cancellationToken);

            return Result<LoginResponse>.Unauthorized("Invalid login credentials.");
        }

        if (!user.IsEmailVerified)
            return Result<LoginResponse>.Forbidden(
                "Verify your email address before signing in.");

        user.RecordSuccessfulLogin(now);

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
