using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Users;
using Microsoft.Extensions.Options;

namespace Spinner.Api.Features.Auth.UpdateAccountProfile;

public sealed class UpdateAccountProfileHandler
    : IRequestHandler<UpdateAccountProfileCommand, Result<AccountProfileResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAccountCodeGenerator _codeGenerator;
    private readonly AccountSecurityOptions _options;

    public UpdateAccountProfileHandler(
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

    public async Task<Result<AccountProfileResponse>> Handle(
        UpdateAccountProfileCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _dbContext.StaffUsers.FirstOrDefaultAsync(
            candidate => candidate.Id == request.UserId,
            cancellationToken);

        if (user is null || !user.IsActive)
            return Result<AccountProfileResponse>.Unauthorized("The owner account is unavailable.");

        var normalizedEmail = request.EmailAddress.Trim().ToLowerInvariant();
        var normalizedMobile = string.IsNullOrWhiteSpace(request.MobileNumber)
            ? null
            : request.MobileNumber.Trim();

        var duplicateEmail = await _dbContext.StaffUsers.AnyAsync(
            candidate =>
                candidate.Id != request.UserId &&
                candidate.EmailAddress == normalizedEmail,
            cancellationToken);

        if (duplicateEmail)
            return Result<AccountProfileResponse>.Conflict("That email address is already used by another account.");

        if (normalizedMobile is not null)
        {
            var duplicateMobile = await _dbContext.StaffUsers.AnyAsync(
                candidate =>
                    candidate.Id != request.UserId &&
                    candidate.MobileNumber == normalizedMobile,
                cancellationToken);

            if (duplicateMobile)
                return Result<AccountProfileResponse>.Conflict("That mobile number is already used by another account.");
        }

        var emailChanged = !string.Equals(
            user.EmailAddress,
            normalizedEmail,
            StringComparison.Ordinal);
        var now = DateTimeOffset.UtcNow;

        user.UpdateProfile(
            request.FullName,
            normalizedEmail,
            normalizedMobile,
            now);

        user.SetPhotoUrl(request.PhotoUrl, now);

        if (emailChanged)
        {
            var activeCodes = await _dbContext.AccountActionCodes
                .Where(candidate =>
                    candidate.UserId == user.Id &&
                    candidate.Purpose == AccountActionPurpose.VerifyEmail &&
                    candidate.ConsumedAt == null)
                .ToListAsync(cancellationToken);
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
                "Verify your updated Spinner email address",
                $"Your Spinner verification code is {code}. It expires in {expiresInMinutes} minutes.",
                now));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<AccountProfileResponse>.Success(AccountProfileResponse.FromEntity(user));
    }
}
