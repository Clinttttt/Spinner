using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.ActivityLogs;
using Spinner.Api.Features.BusinessSettings;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.Bookings.ConfirmBooking;

public sealed class ConfirmBookingHandler : IRequestHandler<ConfirmBookingCommand, Result<OrderDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public ConfirmBookingHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<OrderDetailsResponse>> Handle(
        ConfirmBookingCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(
                order => order.Id == request.BookingId && order.Source == OrderSource.CustomerWeb,
                cancellationToken);

        if (order is null)
            return Result<OrderDetailsResponse>.NotFound("Booking was not found.");

        var now = DateTimeOffset.UtcNow;
        var transition = order.Confirm(now);

        if (!transition.IsSuccess)
            return Result<OrderDetailsResponse>.Conflict(transition.Error.Message);

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);
        BookingNotificationQueue.QueueBookingConfirmed(
            _dbContext,
            order,
            settings.BusinessName,
            BusinessSettingsResponse.FromEntity(settings),
            now);

        ActivityLogRecorder.RecordOrderActivity(
            _dbContext,
            order,
            "BookingConfirmed",
            $"Booking {order.OrderCode} was confirmed.",
            now);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<OrderDetailsResponse>.Success(OrderDetailsResponse.FromEntity(order));
    }
}
