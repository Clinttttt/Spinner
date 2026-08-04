using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.Bookings.GetBookingConfirmation;

public sealed class GetBookingConfirmationHandler
    : IRequestHandler<GetBookingConfirmationQuery, Result<BookingConfirmationResponse>>
{
    private readonly AppDbContext _dbContext;

    public GetBookingConfirmationHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<BookingConfirmationResponse>> Handle(
        GetBookingConfirmationQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(
                order => order.OrderCode == request.OrderCode && order.Source == OrderSource.CustomerWeb,
                cancellationToken);

        if (order is null)
            return Result<BookingConfirmationResponse>.NotFound("Booking confirmation was not found.");

        var response = new BookingConfirmationResponse(
            order.Id,
            order.OrderCode,
            order.TrackingCode,
            order.ContactName,
            order.Customer.MobileNumber,
            order.Customer.EmailAddress,
            order.ServiceName,
            order.UnitLabel,
            order.LoadCount,
            order.FulfillmentType,
            order.Address,
            order.PreferredDate,
            order.PreferredTimeWindow,
            order.PaymentMethod,
            order.PaymentStatus,
            order.Status,
            order.EstimatedServiceAmount,
            order.EstimatedDeliveryFee,
            order.EstimatedTotalAmount,
            order.AdditionalNotes);

        return Result<BookingConfirmationResponse>.Success(response);
    }
}
