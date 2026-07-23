using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Auth.GetCurrentAccount;

public sealed class GetCurrentAccountHandler
    : IRequestHandler<GetCurrentAccountQuery, Result<AccountProfileResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetCurrentAccountHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<AccountProfileResponse>> Handle(
        GetCurrentAccountQuery request,
        CancellationToken cancellationToken)
    {
        var user = await _dbContext.StaffUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(
                candidate => candidate.Id == request.UserId,
                cancellationToken);

        if (user is null || !user.IsActive)
            return Result<AccountProfileResponse>.Unauthorized("The owner account is unavailable.");

        return Result<AccountProfileResponse>.Success(AccountProfileResponse.FromEntity(user));
    }
}
