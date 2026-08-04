using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Common.Security;
using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Users;

namespace Spinner.Api.Features.Staff.InviteStaff;

public sealed class InviteStaffHandler
    : IRequestHandler<InviteStaffCommand, Result<InviteStaffResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAccountCodeGenerator _codeGenerator;
    private readonly AccountSecurityOptions _options;

    public InviteStaffHandler(
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

    public async Task<Result<InviteStaffResponse>> Handle(
        InviteStaffCommand request,
        CancellationToken cancellationToken)
    {
        var emailAddress = request.EmailAddress.Trim().ToLowerInvariant();
        var now = DateTimeOffset.UtcNow;

        if (await _dbContext.StaffUsers.AnyAsync(
                user => user.EmailAddress == emailAddress,
                cancellationToken))
        {
            return Result<InviteStaffResponse>.Conflict(
                "Someone with this email address already has an account.");
        }

        // Replaced rather than stacked, so the owner re-inviting somebody does not
        // leave several codes working at once.
        var existing = await _dbContext.StaffInvitations
            .Where(invitation =>
                invitation.EmailAddress == emailAddress &&
                invitation.AcceptedAt == null &&
                invitation.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var invitation in existing)
            invitation.Revoke(now);

        var code = _codeGenerator.Generate();
        var expiresAt = now.AddDays(Math.Max(1, _options.InvitationDays));

        var created = new StaffInvitation(
            emailAddress,
            request.Role,
            _passwordHasher.Hash(code),
            request.InvitedByUserId,
            expiresAt,
            now);

        _dbContext.StaffInvitations.Add(created);
        _dbContext.NotificationOutboxMessages.Add(new NotificationOutboxMessage(
            NotificationChannel.Email,
            emailAddress,
            "You have been invited to Spinner",
            $"Use invitation code {code} to create your Spinner account. " +
            $"It expires on {expiresAt:dd MMM yyyy}.",
            now));

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<InviteStaffResponse>.Created(new InviteStaffResponse(
            created.Id,
            created.EmailAddress,
            created.Role,
            code,
            created.ExpiresAt));
    }
}
