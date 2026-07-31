using Spinner.Api.Domain.Customers;
using Spinner.Api.Domain.Services;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Domain.Orders;

public sealed class LaundryOrder
{
    private readonly List<OrderServiceItem> _serviceItems = [];

    private LaundryOrder()
    {
    }

    public LaundryOrder(
        string orderCode,
        string trackingCode,
        Customer customer,
        LaundryService service,
        FulfillmentType fulfillmentType,
        string address,
        DateOnly preferredDate,
        string preferredTimeWindow,
        PaymentMethod paymentMethod,
        int loadCount,
        string? additionalNotes,
        DateTimeOffset now,
        PickupLocationSnapshot? pickupLocation = null)
    {
        Id = Guid.NewGuid();
        OrderCode = orderCode;
        TrackingCode = trackingCode;
        Customer = customer;
        CustomerId = customer.Id;
        Service = service;
        ServiceId = service.Id;
        ServiceName = service.Name;
        UnitLabel = service.UnitLabel;
        FulfillmentType = fulfillmentType;
        Address = address.Trim();
        PreferredDate = preferredDate;
        PreferredTimeWindow = preferredTimeWindow.Trim();
        PaymentMethod = paymentMethod;
        PaymentStatus = PaymentStatus.Unpaid;
        Source = OrderSource.CustomerWeb;
        Status = OrderStatus.BookingReceived;
        PickupStatus = fulfillmentType == FulfillmentType.PickupAndDelivery
            ? Domain.Orders.PickupStatus.Scheduled
            : null;
        LoadCount = loadCount;
        EstimatedServiceAmount = service.BasePrice * loadCount;
        EstimatedDeliveryFee = fulfillmentType == FulfillmentType.PickupAndDelivery
            ? service.DeliveryFee ?? 0m
            : 0m;
        EstimatedTotalAmount = EstimatedServiceAmount + EstimatedDeliveryFee;
        _serviceItems.Add(new OrderServiceItem(service, loadCount));
        AdditionalNotes = string.IsNullOrWhiteSpace(additionalNotes) ? null : additionalNotes.Trim();
        PickupLocation = pickupLocation;
        PreferredNotificationChannel = PreferredNotificationChannel.Sms;
        CreatedAt = now;
        UpdatedAt = now;
    }

    public static LaundryOrder CreateManual(
        string orderCode,
        string trackingCode,
        Customer customer,
        IReadOnlyList<(LaundryService Service, int Quantity)> serviceSelections,
        FulfillmentType fulfillmentType,
        string address,
        DateOnly preferredDate,
        string preferredTimeWindow,
        PaymentMethod paymentMethod,
        decimal additionalCharge,
        string? additionalChargeReason,
        decimal discount,
        string? discountReason,
        string? additionalNotes,
        string? specialInstructions,
        PreferredNotificationChannel preferredNotificationChannel,
        DateTimeOffset now,
        PickupLocationSnapshot? pickupLocation = null)
    {
        if (serviceSelections.Count == 0)
            throw new ArgumentException("At least one service is required.", nameof(serviceSelections));

        var primary = serviceSelections[0];
        var order = new LaundryOrder(
            orderCode,
            trackingCode,
            customer,
            primary.Service,
            fulfillmentType,
            address,
            preferredDate,
            preferredTimeWindow,
            paymentMethod,
            primary.Quantity,
            additionalNotes,
            now,
            pickupLocation);

        order.Source = OrderSource.OwnerManual;
        order.Status = fulfillmentType == FulfillmentType.WalkIn
            ? OrderStatus.BeingProcessed
            : OrderStatus.Confirmed;
        order.PickupStatus = fulfillmentType == FulfillmentType.PickupAndDelivery
            ? Domain.Orders.PickupStatus.Scheduled
            : null;
        order._serviceItems.Clear();

        foreach (var selection in serviceSelections)
            order._serviceItems.Add(new OrderServiceItem(selection.Service, selection.Quantity));

        order.LoadCount = serviceSelections.Sum(selection => selection.Quantity);
        order.EstimatedServiceAmount = order._serviceItems.Sum(item => item.Subtotal);
        order.EstimatedDeliveryFee = fulfillmentType == FulfillmentType.PickupAndDelivery
            ? primary.Service.DeliveryFee ?? 0m
            : 0m;
        order.AdditionalCharge = additionalCharge;
        order.AdditionalChargeReason = Normalize(additionalChargeReason);
        order.Discount = discount;
        order.DiscountReason = Normalize(discountReason);
        order.EstimatedTotalAmount = Math.Max(
            0m,
            order.EstimatedServiceAmount + order.EstimatedDeliveryFee + additionalCharge - discount);
        order.SpecialInstructions = Normalize(specialInstructions);
        order.PreferredNotificationChannel = preferredNotificationChannel;

        return order;
    }

    public Guid Id { get; private set; }
    public string OrderCode { get; private set; } = string.Empty;
    public string TrackingCode { get; private set; } = string.Empty;
    public OrderSource Source { get; private set; }
    public Guid CustomerId { get; private set; }
    public Customer Customer { get; private set; } = null!;
    public Guid ServiceId { get; private set; }
    public LaundryService Service { get; private set; } = null!;
    public string ServiceName { get; private set; } = string.Empty;
    public string UnitLabel { get; private set; } = string.Empty;
    public FulfillmentType FulfillmentType { get; private set; }
    public string Address { get; private set; } = string.Empty;
    public DateOnly PreferredDate { get; private set; }
    public string PreferredTimeWindow { get; private set; } = string.Empty;
    public PaymentMethod PaymentMethod { get; private set; }
    public PaymentStatus PaymentStatus { get; private set; }
    public DateTimeOffset? PaidAt { get; private set; }
    public string? ReceiptCode { get; private set; }
    public string? OnlinePaymentReference { get; private set; }
    public string? OnlinePaymentCheckoutUrl { get; private set; }
    public OrderStatus Status { get; private set; }
    public PickupStatus? PickupStatus { get; private set; }
    public string? PickupFailureReason { get; private set; }
    public DateTimeOffset? PickupUpdatedAt { get; private set; }
    public DeliveryStatus? DeliveryStatus { get; private set; }
    public string? DeliveryFailureReason { get; private set; }
    public DateTimeOffset? DeliveryUpdatedAt { get; private set; }
    public int LoadCount { get; private set; }
    public IReadOnlyCollection<OrderServiceItem> ServiceItems => _serviceItems.AsReadOnly();
    public decimal EstimatedServiceAmount { get; private set; }
    public decimal EstimatedDeliveryFee { get; private set; }
    public decimal EstimatedTotalAmount { get; private set; }
    public decimal AdditionalCharge { get; private set; }
    public string? AdditionalChargeReason { get; private set; }
    public decimal Discount { get; private set; }
    public string? DiscountReason { get; private set; }
    public string? AdditionalNotes { get; private set; }
    public string? SpecialInstructions { get; private set; }
    public PreferredNotificationChannel PreferredNotificationChannel { get; private set; }
    public PickupLocationSnapshot? PickupLocation { get; private set; }
    public DateTimeOffset? ArchivedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public bool IsArchived => ArchivedAt is not null;

    public bool IsClosed => Status is OrderStatus.Completed or OrderStatus.Rejected;

    /// <summary>
    /// Removes a finished order from the owner's active work lists without
    /// deleting it. Financial history, receipts, and reports keep the record.
    /// </summary>
    public Result Archive(DateTimeOffset now)
    {
        if (!IsClosed)
            return Result.Conflict("Only completed or rejected orders can be cleared from the list.");

        if (IsArchived)
            return Result.Success();

        ArchivedAt = now;
        UpdatedAt = now;

        return Result.Success();
    }

    public Result Restore(DateTimeOffset now)
    {
        if (!IsArchived)
            return Result.Success();

        ArchivedAt = null;
        UpdatedAt = now;

        return Result.Success();
    }

    public Result Confirm(DateTimeOffset now)
    {
        if (Status != OrderStatus.BookingReceived)
            return Result.Conflict("Only bookings with Booking Received status can be confirmed.");

        Status = OrderStatus.Confirmed;
        UpdatedAt = now;

        return Result.Success();
    }

    public Result Reject(DateTimeOffset now)
    {
        if (Status != OrderStatus.BookingReceived)
            return Result.Conflict("Only bookings with Booking Received status can be rejected.");

        Status = OrderStatus.Rejected;
        UpdatedAt = now;

        return Result.Success();
    }

    public Result Reschedule(DateOnly preferredDate, string preferredTimeWindow, DateTimeOffset now)
    {
        if (Status is OrderStatus.Completed or OrderStatus.Rejected)
            return Result.Conflict("Completed or rejected bookings cannot be rescheduled.");

        PreferredDate = preferredDate;
        PreferredTimeWindow = preferredTimeWindow.Trim();
        UpdatedAt = now;

        return Result.Success();
    }

    public Result UpdateStatus(OrderStatus nextStatus, DateTimeOffset now)
    {
        if (Status is OrderStatus.Completed or OrderStatus.Rejected)
            return Result.Conflict("Completed or rejected orders cannot change status.");

        if (nextStatus == Status)
            return Result.Success();

        if (nextStatus == OrderStatus.Completed && PaymentStatus != PaymentStatus.Paid)
            return Result.Conflict("Order cannot be completed until payment is confirmed.");

        if (!IsValidNextStatus(nextStatus))
            return Result.Conflict($"Invalid order status transition from {Status} to {nextStatus}.");

        Status = nextStatus;

        if (nextStatus == OrderStatus.ReadyForDelivery && FulfillmentType == FulfillmentType.PickupAndDelivery)
        {
            DeliveryStatus = Domain.Orders.DeliveryStatus.Ready;
            DeliveryFailureReason = null;
            DeliveryUpdatedAt = now;
        }

        UpdatedAt = now;

        return Result.Success();
    }

    private bool IsValidNextStatus(OrderStatus nextStatus) => Status switch
    {
        OrderStatus.BookingReceived => nextStatus == OrderStatus.Confirmed,
        OrderStatus.Confirmed => nextStatus == OrderStatus.PickedUp ||
            (FulfillmentType != FulfillmentType.PickupAndDelivery && nextStatus == OrderStatus.BeingProcessed),
        OrderStatus.PickedUp => nextStatus == OrderStatus.BeingProcessed,
        OrderStatus.BeingProcessed => nextStatus == OrderStatus.ReadyForDelivery,
        OrderStatus.ReadyForDelivery => nextStatus == OrderStatus.Completed,
        _ => false
    };

    public Result MarkPickedUp(DateTimeOffset now)
    {
        if (FulfillmentType != FulfillmentType.PickupAndDelivery)
            return Result.Conflict("Only pickup and delivery orders can be marked picked up.");

        if (PickupStatus == Domain.Orders.PickupStatus.PickedUp)
            return Result.Conflict("Order is already marked picked up.");

        if (Status != OrderStatus.Confirmed)
            return Result.Conflict("Only confirmed orders can be marked picked up.");

        var transition = UpdateStatus(OrderStatus.PickedUp, now);

        if (!transition.IsSuccess)
            return transition;

        PickupStatus = Domain.Orders.PickupStatus.PickedUp;
        PickupFailureReason = null;
        PickupUpdatedAt = now;

        return Result.Success();
    }

    public Result MarkBeingProcessed(DateTimeOffset now)
    {
        return UpdateStatus(OrderStatus.BeingProcessed, now);
    }

    public Result MarkReadyForDelivery(DateTimeOffset now)
    {
        return UpdateStatus(OrderStatus.ReadyForDelivery, now);
    }

    public Result ConfirmCodPayment(string receiptCode, DateTimeOffset now)
    {
        if (PaymentMethod != PaymentMethod.CashOnDelivery)
            return Result.Conflict("Only COD / Pay on Claim orders can be manually marked paid.");

        if (PaymentStatus == PaymentStatus.Paid)
            return Result.Conflict("Payment is already confirmed.");

        if (Status is OrderStatus.BookingReceived or OrderStatus.Rejected)
            return Result.Conflict("Payment cannot be confirmed before the order is active.");

        PaymentStatus = PaymentStatus.Paid;
        PaidAt = now;
        ReceiptCode = receiptCode.Trim();
        UpdatedAt = now;

        return Result.Success();
    }

    public Result CreateOnlinePaymentLink(string paymentReference, string checkoutUrl, DateTimeOffset now)
    {
        if (PaymentMethod != PaymentMethod.QrCodeOnlinePayment)
            return Result.Conflict("Only QR Code Online Payment orders can have an online payment link.");

        if (PaymentStatus == PaymentStatus.Paid)
            return Result.Conflict("Payment is already confirmed.");

        if (Status is OrderStatus.BookingReceived or OrderStatus.Rejected)
            return Result.Conflict("Online payment link can only be created for active orders.");

        OnlinePaymentReference = paymentReference.Trim();
        OnlinePaymentCheckoutUrl = checkoutUrl.Trim();
        UpdatedAt = now;

        return Result.Success();
    }

    public Result ConfirmOnlinePayment(string paymentReference, decimal paidAmount, string receiptCode, DateTimeOffset now)
    {
        if (PaymentMethod != PaymentMethod.QrCodeOnlinePayment)
            return Result.Conflict("Only QR Code Online Payment orders can be confirmed by online payment webhook.");

        if (string.IsNullOrWhiteSpace(OnlinePaymentReference))
            return Result.Conflict("Online payment reference has not been created.");

        if (!string.Equals(OnlinePaymentReference, paymentReference.Trim(), StringComparison.Ordinal))
            return Result.Conflict("Online payment reference does not match this order.");

        if (PaymentStatus == PaymentStatus.Paid)
            return Result.Success();

        if (Status is OrderStatus.BookingReceived or OrderStatus.Rejected)
            return Result.Conflict("Payment cannot be confirmed before the order is active.");

        if (paidAmount != EstimatedTotalAmount)
            return Result.Conflict("Online payment amount does not match the expected order total.");

        PaymentStatus = PaymentStatus.Paid;
        PaidAt = now;
        ReceiptCode = receiptCode.Trim();
        UpdatedAt = now;

        return Result.Success();
    }

    public Result ReschedulePickup(DateOnly preferredDate, string preferredTimeWindow, DateTimeOffset now)
    {
        if (FulfillmentType != FulfillmentType.PickupAndDelivery)
            return Result.Conflict("Only pickup and delivery orders can be rescheduled for pickup.");

        if (Status is OrderStatus.PickedUp or OrderStatus.BeingProcessed or OrderStatus.ReadyForDelivery or OrderStatus.Completed or OrderStatus.Rejected)
            return Result.Conflict("Pickup cannot be rescheduled after pickup or after the order is closed.");

        var result = Reschedule(preferredDate, preferredTimeWindow, now);

        if (!result.IsSuccess)
            return result;

        PickupStatus = Domain.Orders.PickupStatus.Rescheduled;
        PickupFailureReason = null;
        PickupUpdatedAt = now;

        return Result.Success();
    }

    public Result FailPickup(string reason, DateTimeOffset now)
    {
        if (FulfillmentType != FulfillmentType.PickupAndDelivery)
            return Result.Conflict("Only pickup and delivery orders can have failed pickup.");

        if (Status != OrderStatus.Confirmed)
            return Result.Conflict("Only confirmed orders can be marked as failed pickup.");

        PickupStatus = Domain.Orders.PickupStatus.FailedPickup;
        PickupFailureReason = reason.Trim();
        PickupUpdatedAt = now;
        UpdatedAt = now;

        return Result.Success();
    }

    public Result MarkOutForDelivery(DateTimeOffset now)
    {
        if (FulfillmentType != FulfillmentType.PickupAndDelivery)
            return Result.Conflict("Only pickup and delivery orders can be marked out for delivery.");

        if (Status != OrderStatus.ReadyForDelivery)
            return Result.Conflict("Only ready for delivery orders can be marked out for delivery.");

        if (DeliveryStatus != Domain.Orders.DeliveryStatus.Ready)
            return Result.Conflict("Only ready deliveries can be marked out for delivery.");

        DeliveryStatus = Domain.Orders.DeliveryStatus.OutForDelivery;
        DeliveryFailureReason = null;
        DeliveryUpdatedAt = now;
        UpdatedAt = now;

        return Result.Success();
    }

    public Result MarkDelivered(DateTimeOffset now)
    {
        if (FulfillmentType != FulfillmentType.PickupAndDelivery)
            return Result.Conflict("Only pickup and delivery orders can be marked delivered.");

        if (Status != OrderStatus.ReadyForDelivery)
            return Result.Conflict("Only ready for delivery orders can be marked delivered.");

        if (DeliveryStatus != Domain.Orders.DeliveryStatus.OutForDelivery)
            return Result.Conflict("Only out for delivery orders can be marked delivered.");

        DeliveryStatus = Domain.Orders.DeliveryStatus.Delivered;
        DeliveryFailureReason = null;
        DeliveryUpdatedAt = now;
        UpdatedAt = now;

        return Result.Success();
    }

    public Result FailDelivery(string reason, DateTimeOffset now)
    {
        if (FulfillmentType != FulfillmentType.PickupAndDelivery)
            return Result.Conflict("Only pickup and delivery orders can have failed delivery.");

        if (Status != OrderStatus.ReadyForDelivery)
            return Result.Conflict("Only ready for delivery orders can have failed delivery.");

        if (DeliveryStatus is not (Domain.Orders.DeliveryStatus.Ready or Domain.Orders.DeliveryStatus.OutForDelivery))
            return Result.Conflict("Only ready or out for delivery orders can have failed delivery.");

        DeliveryStatus = Domain.Orders.DeliveryStatus.FailedDelivery;
        DeliveryFailureReason = reason.Trim();
        DeliveryUpdatedAt = now;
        UpdatedAt = now;

        return Result.Success();
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
