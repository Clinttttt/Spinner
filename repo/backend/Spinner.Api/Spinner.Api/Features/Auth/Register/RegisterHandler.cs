using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Users;
using Microsoft.Extensions.Options;

namespace Spinner.Api.Features.Auth.Register;

public sealed class RegisterHandler
    : IRequestHandler<RegisterCommand, Result<RegisterResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAccountCodeGenerator _codeGenerator;
    private readonly AccountSecurityOptions _options;

    public RegisterHandler(
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

    public async Task<Result<RegisterResponse>> Handle(
        RegisterCommand request,
        CancellationToken cancellationToken)
    {
        var emailAddress = request.EmailAddress.Trim().ToLowerInvariant();
        var mobileNumber = request.MobileNumber.Trim();

        if (await _dbContext.StaffUsers.AnyAsync(
                user => user.EmailAddress == emailAddress,
                cancellationToken))
        {
            return Result<RegisterResponse>.Conflict(
                "An account with this email address already exists.");
        }

        if (await _dbContext.StaffUsers.AnyAsync(
                user => user.MobileNumber == mobileNumber,
                cancellationToken))
        {
            return Result<RegisterResponse>.Conflict(
                "An account with this mobile number already exists.");
        }

        var now = DateTimeOffset.UtcNow;
        var user = new StaffUser(
            request.FullName,
            emailAddress,
            mobileNumber,
            _passwordHasher.Hash(request.Password),
            StaffRole.Owner,
            now);

        var code = _codeGenerator.Generate();
        var expiresInMinutes = Math.Max(1, _options.VerificationCodeMinutes);

        _dbContext.StaffUsers.Add(user);
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

        return Result<RegisterResponse>.Success(new RegisterResponse(
            user.EmailAddress,
            true,
            expiresInMinutes));
    }
}
