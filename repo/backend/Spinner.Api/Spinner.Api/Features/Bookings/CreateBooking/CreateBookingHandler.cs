using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Geo;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Customers;
using Spinner.Api.Domain.Notifications;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Features.BusinessSettings;
using Spinner.Api.Features.Orders;
using Spinner.Api.Features.ServiceArea;

namespace Spinner.Api.Features.Bookings.CreateBooking;

public sealed class CreateBookingHandler : IRequestHandler<CreateBookingCommand, Result<BookingConfirmationResponse>>
{
    private readonly AppDbContext _dbContext;
    private readonly IServiceAreaPolicyProvider _serviceAreaPolicyProvider;

    public CreateBookingHandler(
        AppDbContext dbContext,
        IServiceAreaPolicyProvider serviceAreaPolicyProvider)
    {
        _dbContext = dbContext;
        _serviceAreaPolicyProvider = serviceAreaPolicyProvider;
    }

    public async Task<Result<BookingConfirmationResponse>> Handle(
        CreateBookingCommand request,
        CancellationToken cancellationToken)
    {
        var service = await _dbContext.LaundryServices
            .FirstOrDefaultAsync(service => service.Id == request.ServiceId, cancellationToken);

        if (service is null)
            return Result<BookingConfirmationResponse>.NotFound("Selected service was not found.");

        if (!service.IsActive)
            return Result<BookingConfirmationResponse>.Conflict("Selected service is not active.");

        if (request.FulfillmentType == FulfillmentType.PickupAndDelivery && !service.SupportsPickupAndDelivery)
            return Result<BookingConfirmationResponse>.Validation("Selected service does not support pickup and delivery.");

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        if (request.PaymentMethod == PaymentMethod.CashOnDelivery && !settings.IsCashOnDeliveryEnabled)
            return Result<BookingConfirmationResponse>.Validation("Cash on Delivery / Pay on Claim is not enabled.");

        if (request.PaymentMethod == PaymentMethod.QrCodeOnlinePayment && !settings.IsQrCodeOnlinePaymentEnabled)
            return Result<BookingConfirmationResponse>.Validation("QR Code Online Payment is not enabled.");

        // Judge the coordinates, never the written address. A pin outside the
        // pickup area is refused; a booking with no pin is still accepted so a
        // failed GPS lookup or an unrecognised purok cannot lock a customer out.
        if (request.FulfillmentType == FulfillmentType.PickupAndDelivery && request.PickupLocation is not null)
        {
            var policy = await _serviceAreaPolicyProvider.GetAsync(cancellationToken);
            var decision = policy.Evaluate(
                new GeoPoint(request.PickupLocation.Latitude, request.PickupLocation.Longitude));

            if (!decision.AllowsBooking)
                return Result<BookingConfirmationResponse>.Validation(decision.Message);
        }

        var now = DateTimeOffset.UtcNow;

        // A replayed submit must not create a second booking. This covers double
        // taps and client retries where the first request reached the server but
        // the response never made it back to the customer's phone.
        var replay = await DuplicateOrderGuard.FindRecentIdenticalAsync(
            _dbContext,
            OrderSource.CustomerWeb,
            request.MobileNumber,
            request.FulfillmentType,
            request.PreferredDate,
            request.PreferredTimeWindow,
            (service.BasePrice * request.LoadCount) +
                (request.FulfillmentType == FulfillmentType.PickupAndDelivery ? service.DeliveryFee ?? 0m : 0m),
            now,
            cancellationToken);

        if (replay is not null)
            return Result<BookingConfirmationResponse>.Success(ToResponse(replay));

        var customer = await GetOrCreateCustomerAsync(request, now, cancellationToken);
        var order = new LaundryOrder(
            BookingCodeGenerator.NewOrderCode(now),
            BookingCodeGenerator.NewTrackingCode(),
            customer,
            service,
            request.FulfillmentType,
            request.Address,
            request.PreferredDate,
            request.PreferredTimeWindow,
            request.PaymentMethod,
            request.LoadCount,
            request.AdditionalNotes,
            now,
            request.PickupLocation?.ToSnapshot());

        _dbContext.LaundryOrders.Add(order);

        if (settings.IsSmsBookingReceivedEnabled)
            _dbContext.NotificationOutboxMessages.Add(CreateBookingReceivedSms(order, customer, settings.BusinessName, now));

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<BookingConfirmationResponse>.Success(ToResponse(order));
    }

    private async Task<Customer> GetOrCreateCustomerAsync(
        CreateBookingCommand request,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var normalizedMobile = request.MobileNumber.Trim();
        var customer = await _dbContext.Customers
            .FirstOrDefaultAsync(customer => customer.MobileNumber == normalizedMobile, cancellationToken);

        if (customer is not null)
        {
            customer.UpdateFromBooking(request.FullName, request.EmailAddress, now);
            return customer;
        }

        customer = new Customer(
            request.FullName,
            request.MobileNumber,
            request.EmailAddress,
            now);

        _dbContext.Customers.Add(customer);

        return customer;
    }

    private static NotificationOutboxMessage CreateBookingReceivedSms(
        LaundryOrder order,
        Customer customer,
        string businessName,
        DateTimeOffset now)
    {
        var message = $"{businessName}: Your booking {order.OrderCode} has been received. " +
            $"Please wait for staff confirmation. Track: /track/{order.TrackingCode}";

        return new NotificationOutboxMessage(
            order.Id,
            NotificationChannel.Sms,
            customer.MobileNumber,
            null,
            message,
            now);
    }

    private static BookingConfirmationResponse ToResponse(LaundryOrder order) => new(
        order.Id,
        order.OrderCode,
        order.TrackingCode,
        order.Customer.FullName,
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
}
