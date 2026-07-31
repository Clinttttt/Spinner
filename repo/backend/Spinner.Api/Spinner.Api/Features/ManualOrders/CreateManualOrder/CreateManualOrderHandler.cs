using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Customers;
using Spinner.Api.Domain.Orders;
using Spinner.Api.Domain.Services;
using Spinner.Api.Features.ActivityLogs;
using Spinner.Api.Features.Bookings;
using Spinner.Api.Features.BusinessSettings;
using Spinner.Api.Features.Orders;

namespace Spinner.Api.Features.ManualOrders.CreateManualOrder;

public sealed class CreateManualOrderHandler
    : IRequestHandler<CreateManualOrderCommand, Result<OrderDetailsResponse>>
{
    private readonly AppDbContext _dbContext;

    public CreateManualOrderHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<OrderDetailsResponse>> Handle(
        CreateManualOrderCommand request,
        CancellationToken cancellationToken)
    {
        var requestedServiceIds = request.Services.Select(item => item.ServiceId).Distinct().ToList();
        var services = await _dbContext.LaundryServices
            .Where(service => requestedServiceIds.Contains(service.Id))
            .ToListAsync(cancellationToken);

        if (services.Count != requestedServiceIds.Count)
            return Result<OrderDetailsResponse>.NotFound("One or more selected services were not found.");

        if (services.Any(service => !service.IsActive))
            return Result<OrderDetailsResponse>.Conflict("One or more selected services are inactive.");

        if (request.Method == FulfillmentType.PickupAndDelivery && services.Any(service => !service.SupportsPickupAndDelivery))
            return Result<OrderDetailsResponse>.Validation("Every selected service must support pickup and delivery.");

        var settings = await BusinessSettingsDefaults.GetOrCreateAsync(_dbContext, cancellationToken);

        if (request.PaymentMethod == PaymentMethod.CashOnDelivery && !settings.IsCashOnDeliveryEnabled)
            return Result<OrderDetailsResponse>.Validation("Cash / Pay on Claim is not enabled.");

        if (request.PaymentMethod == PaymentMethod.QrCodeOnlinePayment && !settings.IsQrCodeOnlinePaymentEnabled)
            return Result<OrderDetailsResponse>.Validation("QR Code Online Payment is not enabled.");

        var selections = request.Services
            .Select(item => ((LaundryService)services.Single(service => service.Id == item.ServiceId), item.Quantity))
            .ToList();
        var now = DateTimeOffset.UtcNow;
        var serviceAmount = selections.Sum(selection => selection.Item1.BasePrice * selection.Quantity);
        var deliveryFee = request.Method == FulfillmentType.PickupAndDelivery
            ? selections[0].Item1.DeliveryFee ?? 0m
            : 0m;
        var expectedTotal = Math.Max(
            0m,
            serviceAmount + deliveryFee + request.AdditionalCharge - request.Discount);

        // Replayed submit (double tap or retry after a flaky response).
        var replay = await DuplicateOrderGuard.FindRecentIdenticalAsync(
            _dbContext,
            OrderSource.OwnerManual,
            request.MobileNumber,
            request.Method,
            request.ScheduledDate,
            request.ScheduledTime,
            expectedTotal,
            now,
            cancellationToken);

        if (replay is not null)
            return Result<OrderDetailsResponse>.Success(OrderDetailsResponse.FromEntity(replay));

        // The same job entered twice through different doors. The owner decides,
        // so this is reported rather than silently blocked or silently duplicated.
        if (!request.AllowDuplicate)
        {
            var existingBooking = await DuplicateOrderGuard.FindActiveCrossChannelAsync(
                _dbContext,
                OrderSource.CustomerWeb,
                request.MobileNumber,
                request.ScheduledDate,
                cancellationToken);

            if (existingBooking is not null)
            {
                return Result<OrderDetailsResponse>.PossibleDuplicate(
                    $"{existingBooking.Customer.FullName} already has customer booking " +
                    $"{existingBooking.OrderCode} for {existingBooking.PreferredDate:MMM d} " +
                    $"({existingBooking.PreferredTimeWindow}). Update that booking instead of " +
                    "creating a second order, or create this order anyway if it is a separate job.");
            }
        }

        var customer = await GetOrCreateCustomerAsync(request, now, cancellationToken);
        var address = string.IsNullOrWhiteSpace(request.Address) ? "In-store" : request.Address;
        var order = LaundryOrder.CreateManual(
            BookingCodeGenerator.NewOrderCode(now),
            BookingCodeGenerator.NewTrackingCode(),
            customer,
            selections,
            request.Method,
            address,
            request.ScheduledDate,
            request.ScheduledTime,
            request.PaymentMethod,
            request.AdditionalCharge,
            request.AdditionalChargeReason,
            request.Discount,
            request.DiscountReason,
            request.Notes,
            request.SpecialInstructions,
            request.PreferredNotificationChannel,
            now,
            request.PickupLocation?.ToSnapshot());

        _dbContext.LaundryOrders.Add(order);
        ActivityLogRecorder.RecordOrderActivity(
            _dbContext,
            order,
            "ManualOrderCreated",
            $"Manual order {order.OrderCode} was created by owner/staff.",
            now);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<OrderDetailsResponse>.Created(OrderDetailsResponse.FromEntity(order));
    }

    private async Task<Customer> GetOrCreateCustomerAsync(
        CreateManualOrderCommand request,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var mobileNumber = request.MobileNumber.Trim();
        var customer = await _dbContext.Customers
            .FirstOrDefaultAsync(item => item.MobileNumber == mobileNumber, cancellationToken);

        if (customer is not null)
        {
            customer.UpdateFromBooking(request.CustomerName, request.EmailAddress, now);
            return customer;
        }

        customer = new Customer(request.CustomerName, request.MobileNumber, request.EmailAddress, now);
        _dbContext.Customers.Add(customer);
        return customer;
    }
}
