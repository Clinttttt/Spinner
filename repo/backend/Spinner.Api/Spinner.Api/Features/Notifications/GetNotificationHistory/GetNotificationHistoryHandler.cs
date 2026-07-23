using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Notifications;

namespace Spinner.Api.Features.Notifications.GetNotificationHistory;

public sealed class GetNotificationHistoryHandler
    : IRequestHandler<GetNotificationHistoryQuery, Result<PagedResponse<NotificationHistoryItemResponse>>>
{
    private readonly AppDbContext _dbContext;

    public GetNotificationHistoryHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PagedResponse<NotificationHistoryItemResponse>>> Handle(
        GetNotificationHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.NotificationOutboxMessages
            .AsNoTracking()
            .Include(message => message.Order)
            .AsQueryable();

        if (request.OrderId is not null)
            query = query.Where(message => message.OrderId == request.OrderId.Value);

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (!Enum.TryParse<NotificationStatus>(request.Status.Trim(), ignoreCase: true, out var status))
                return Result<PagedResponse<NotificationHistoryItemResponse>>.Validation("Notification status is invalid.");

            query = query.Where(message => message.Status == status);
        }

        var page = PageRequest.Normalize(request.Page, request.PageSize);
        var totalCount = await query.CountAsync(cancellationToken);
        var history = await query
            .OrderByDescending(message => message.CreatedAt)
            .Skip(page.Offset)
            .Take(page.PageSize)
            .Select(message => new NotificationHistoryItemResponse(
                message.Id,
                message.OrderId,
                message.Order.OrderCode,
                message.Channel,
                message.Recipient,
                message.Subject,
                message.Message,
                message.Status,
                message.AttemptCount,
                message.LastError,
                message.CreatedAt,
                message.SentAt))
            .ToListAsync(cancellationToken);

        return Result<PagedResponse<NotificationHistoryItemResponse>>.Success(
            new PagedResponse<NotificationHistoryItemResponse>(
                history,
                page.Page,
                page.PageSize,
                totalCount));
    }
}
