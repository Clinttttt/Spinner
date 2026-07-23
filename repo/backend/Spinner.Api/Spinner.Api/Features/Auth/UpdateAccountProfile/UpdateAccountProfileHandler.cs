using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Auth.UpdateAccountProfile;

public sealed class UpdateAccountProfileHandler
    : IRequestHandler<UpdateAccountProfileCommand, Result<AccountProfileResponse>>
{
    private readonly AppDbContext _dbContext;

    public UpdateAccountProfileHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
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

        user.UpdateProfile(
            request.FullName,
            normalizedEmail,
            normalizedMobile,
            DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<AccountProfileResponse>.Success(AccountProfileResponse.FromEntity(user));
    }
}
