using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.ActivityLogs.GetActivityLogs;

public sealed class GetActivityLogsHandler
    : IRequestHandler<GetActivityLogsQuery, Result<PagedResponse<ActivityLogResponse>>>
{
    private readonly AppDbContext _dbContext;

    public GetActivityLogsHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PagedResponse<ActivityLogResponse>>> Handle(
        GetActivityLogsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.ActivityLogEntries.AsNoTracking().AsQueryable();

        if (request.EntityId is not null)
            query = query.Where(entry => entry.EntityId == request.EntityId.Value);

        if (!string.IsNullOrWhiteSpace(request.Action))
        {
            var action = request.Action.Trim();
            query = query.Where(entry => entry.Action == action);
        }

        var page = PageRequest.NormalizePage(request.Page);
        var pageSize = PageRequest.NormalizePageSize(request.PageSize);
        var totalCount = await query.CountAsync(cancellationToken);
        var logs = await query
            .OrderByDescending(entry => entry.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(entry => new ActivityLogResponse(
                entry.Id,
                entry.Actor,
                entry.Action,
                entry.EntityType,
                entry.EntityId,
                entry.Description,
                entry.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result<PagedResponse<ActivityLogResponse>>.Success(
            new PagedResponse<ActivityLogResponse>(
                logs,
                page,
                pageSize,
                totalCount));
    }
}
