using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Staff.GetStaffAccounts;

public sealed class GetStaffAccountsHandler
    : IRequestHandler<GetStaffAccountsQuery, Result<IReadOnlyList<StaffAccountResponse>>>
{
    private readonly AppDbContext _dbContext;

    public GetStaffAccountsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<IReadOnlyList<StaffAccountResponse>>> Handle(
        GetStaffAccountsQuery request,
        CancellationToken cancellationToken)
    {
        // Active first, then by name, so the people who can currently get in are at the top
        // and the list reads the same way every time it is opened.
        var users = await _dbContext.StaffUsers
            .AsNoTracking()
            .OrderByDescending(user => user.IsActive)
            .ThenBy(user => user.FullName)
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<StaffAccountResponse>>.Success(
            users.Select(StaffAccountResponse.FromEntity).ToList());
    }
}
