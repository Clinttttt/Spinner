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

        // The shop's own first account. Registration cannot require an invitation
        // here because there is nobody to issue one, so this single case stays open
        // and takes ownership. Every account after it is invitation-only.
        var isFirstAccount = !await _dbContext.StaffUsers.AnyAsync(cancellationToken);

        StaffRole role;
        StaffInvitation? invitation = null;

        if (isFirstAccount)
        {
            role = StaffRole.Owner;
        }
        else
        {
            var invitationResult = await ResolveInvitationAsync(
                emailAddress,
                request.InvitationCode,
                now,
                cancellationToken);

            if (!invitationResult.IsSuccess)
                return Result<RegisterResponse>.Validation(invitationResult.Error.Message);

            invitation = invitationResult.Value!;
            role = invitation.Role;
        }

        var user = new StaffUser(
            request.FullName,
            emailAddress,
            mobileNumber,
            _passwordHasher.Hash(request.Password),
            role,
            now);

        invitation?.Accept(user.Id, now);

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
            "Verify your Spinner account",
            $"Your Spinner verification code is {code}. It expires in {expiresInMinutes} minutes.",
            now));
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<RegisterResponse>.Success(new RegisterResponse(
            user.EmailAddress,
            true,
            expiresInMinutes));
    }

    /// <summary>
    /// Finds and validates the invitation this registration is claiming.
    /// </summary>
    /// <remarks>
    /// The invitation is tied to the email address it was issued for, so a leaked
    /// code cannot be redeemed by somebody else. Attempts are counted for the same
    /// reason they are counted on verification codes: otherwise a short code can be
    /// guessed at leisure.
    /// </remarks>
    private async Task<Result<StaffInvitation>> ResolveInvitationAsync(
        string emailAddress,
        string? submittedCode,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(submittedCode))
        {
            return Result<StaffInvitation>.Validation(
                "An invitation code is required. Ask the shop owner to invite this email address.");
        }

        var candidates = await _dbContext.StaffInvitations
            .Where(invitation =>
                invitation.EmailAddress == emailAddress &&
                invitation.AcceptedAt == null &&
                invitation.RevokedAt == null)
            .ToListAsync(cancellationToken);

        var trimmedCode = submittedCode.Trim();
        var maxAttempts = Math.Max(1, _options.MaxCodeAttempts);

        foreach (var candidate in candidates.Where(c => c.CanAttempt(now, maxAttempts)))
        {
            if (_passwordHasher.Verify(trimmedCode, candidate.CodeHash))
                return Result<StaffInvitation>.Success(candidate);

            candidate.RecordFailedAttempt();
        }

        // Saved so failed attempts actually accumulate rather than being discarded
        // with the rejected request.
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<StaffInvitation>.Validation(
            "This invitation code is not valid for this email address, or it has expired.");
    }
}
