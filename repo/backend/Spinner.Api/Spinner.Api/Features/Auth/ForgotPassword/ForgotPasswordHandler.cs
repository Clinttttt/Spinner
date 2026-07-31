using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Users;

namespace Spinner.Api.Features.Auth.ForgotPassword;

public sealed class ForgotPasswordHandler
    : IRequestHandler<ForgotPasswordCommand, Result<AccountCodeDeliveryResponse>>
{
    private const string DeliveryMessage =
        "If the account exists, a password reset code has been sent to its verified email address.";

    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAccountCodeGenerator _codeGenerator;
    private readonly AccountSecurityOptions _options;

    public ForgotPasswordHandler(
        AppDbContext dbContext,
        IPasswordHasher passwordHasher,
        IAccountCodeGenerator codeGenerator,
        IOptions<AccountSecurityOptions> options)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _codeGenerator = codeGenerator;
        _options = options.Value;
    }

    public async Task<Result<AccountCodeDeliveryResponse>> Handle(
        ForgotPasswordCommand request,
        CancellationToken cancellationToken)
    {
        var rawLogin = request.Login.Trim();
        var normalizedLogin = rawLogin.ToLowerInvariant();
        var user = await _dbContext.StaffUsers.FirstOrDefaultAsync(
            candidate =>
                candidate.EmailAddress == normalizedLogin ||
                candidate.MobileNumber == rawLogin,
            cancellationToken);

        if (user is null || !user.IsActive || !user.IsEmailVerified)
            return Success();

        var now = DateTimeOffset.UtcNow;
        var activeCodes = await _dbContext.AccountActionCodes
            .Where(candidate =>
                candidate.UserId == user.Id &&
                candidate.Purpose == AccountActionPurpose.ResetPassword &&
                candidate.ConsumedAt == null)
            .OrderByDescending(candidate => candidate.CreatedAt)
            .ToListAsync(cancellationToken);

        var cooldownSeconds = Math.Max(0, _options.ResendCooldownSeconds);
        if (activeCodes.Count > 0 &&
            activeCodes[0].CreatedAt.AddSeconds(cooldownSeconds) > now)
        {
            return Success();
        }

        foreach (var activeCode in activeCodes)
            activeCode.Consume(now);

        var code = _codeGenerator.Generate();
        var expiresInMinutes = Math.Max(1, _options.PasswordResetCodeMinutes);
        _dbContext.AccountActionCodes.Add(new AccountActionCode(
            user.Id,
            AccountActionPurpose.ResetPassword,
            _passwordHasher.Hash(code),
            now.AddMinutes(expiresInMinutes),
            now));
        _dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
            NotificationChannel.Email,
            user.EmailAddress,
            "Reset your Spinner owner password",
            $"Your Spinner password reset code is {code}. It expires in {expiresInMinutes} minutes.",
            now));
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Success();
    }

    private static Result<AccountCodeDeliveryResponse> Success() =>
        Result<AccountCodeDeliveryResponse>.Success(
            new AccountCodeDeliveryResponse(DeliveryMessage));
}
