using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Users;

namespace Spinner.Api.Features.Auth.ResendVerification;

public sealed class ResendVerificationHandler
    : IRequestHandler<ResendVerificationCommand, Result<AccountCodeDeliveryResponse>>
{
    private const string DeliveryMessage =
        "If an unverified account exists, a new verification code has been sent.";

    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAccountCodeGenerator _codeGenerator;
    private readonly AccountSecurityOptions _options;

    public ResendVerificationHandler(
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
        ResendVerificationCommand request,
        CancellationToken cancellationToken)
    {
        var emailAddress = request.EmailAddress.Trim().ToLowerInvariant();
        var user = await _dbContext.StaffUsers.FirstOrDefaultAsync(
            candidate => candidate.EmailAddress == emailAddress,
            cancellationToken);

        if (user is null || !user.IsActive || user.IsEmailVerified)
            return Success();

        var now = DateTimeOffset.UtcNow;
        var activeCodes = await _dbContext.AccountActionCodes
            .Where(candidate =>
                candidate.UserId == user.Id &&
                candidate.Purpose == AccountActionPurpose.VerifyEmail &&
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
        var expiresInMinutes = Math.Max(1, _options.VerificationCodeMinutes);
        _dbContext.AccountActionCodes.Add(new AccountActionCode(
            user.Id,
            AccountActionPurpose.VerifyEmail,
            _passwordHasher.Hash(code),
            now.AddMinutes(expiresInMinutes),
            now));
        _dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
            NotificationChannel.Email,
            user.EmailAddress,
            "Verify your Spinner owner account",
            $"Your Spinner verification code is {code}. It expires in {expiresInMinutes} minutes.",
            now));
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Success();
    }

    private static Result<AccountCodeDeliveryResponse> Success() =>
        Result<AccountCodeDeliveryResponse>.Success(
            new AccountCodeDeliveryResponse(DeliveryMessage));
}
