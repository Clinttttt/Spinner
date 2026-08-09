using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.Notifications.ResendNotification;

public sealed record ResendNotificationCommand(Guid NotificationId) : IRequest<Result>;

/// <summary>
/// Puts a notification that gave up back in the queue.
/// </summary>
/// <remarks>
/// Recovers messages lost to a fault at our end rather than a bad address. Sending from
/// an unverified domain rejected every customer receipt for weeks, and once those
/// messages had spent their attempts there was no way to deliver them even after the
/// cause was fixed — the customer simply never heard from the shop.
///
/// The message is only requeued here. Sending stays with the outbox worker, so a resend
/// inherits the same claim, retry limit and duplicate protection as any other message,
/// and the owner is not left waiting on a provider call.
/// </remarks>
public sealed class ResendNotificationHandler : IRequestHandler<ResendNotificationCommand, Result>
{
    private readonly AppDbContext _dbContext;

    public ResendNotificationHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result> Handle(
        ResendNotificationCommand request,
        CancellationToken cancellationToken)
    {
        var message = await _dbContext.NotificationOutboxMessages
            .FirstOrDefaultAsync(item => item.Id == request.NotificationId, cancellationToken);

        if (message is null)
            return Result.NotFound("That notification was not found.");

        var requeued = message.Requeue(DateTimeOffset.UtcNow);
        if (!requeued.IsSuccess)
            return requeued;

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // The worker picked it up between the read and the save. Nothing is wrong and
            // nothing is lost: it is being sent.
            return Result.Conflict("This message is being sent right now.");
        }

        return Result.NoContent();
    }
}
