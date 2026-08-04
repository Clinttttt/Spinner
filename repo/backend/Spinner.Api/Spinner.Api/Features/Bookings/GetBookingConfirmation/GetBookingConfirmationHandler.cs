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
        // Accepts either code, in any case, ignoring stray spacing.
        //
        // The confirmation shows the customer an "Order reference" and a "Tracking
        // code", so someone trying to track their order naturally types the tracking
        // code — which used to return "not found". Matching was also case sensitive
        // and untrimmed, so a code pasted from a message or typed in lower case
        // failed too. None of that is the customer's mistake.
        var code = request.OrderCode?.Trim() ?? string.Empty;

        if (code.Length is 0 or > 64)
            return Result<BookingConfirmationResponse>.NotFound("Booking confirmation was not found.");

        var normalized = code.ToUpperInvariant();

        var order = await _dbContext.LaundryOrders
            .AsNoTracking()
            .Include(order => order.Customer)
            .FirstOrDefaultAsync(
                order =>
                    order.Source == OrderSource.CustomerWeb &&
                    (order.OrderCode.ToUpper() == normalized ||
                     order.TrackingCode.ToUpper() == normalized),
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
