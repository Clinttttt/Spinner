using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Payments;
using Spinner.Api.Features.Bookings.CreateBooking;
using Spinner.Api.Features.Bookings.StartBookingCheckout;

namespace Spinner.Api.Features.Payments;

/// <summary>
/// Turns a paid pending booking into exactly one order.
/// </summary>
/// <remarks>
/// Two things can trigger this: the provider's webhook, and the customer's return
/// page asking for status. Either may arrive first, and the webhook may arrive more
/// than once, so this has to be safe to call repeatedly.
///
/// The guarantee comes from doing the work in one transaction and writing the order
/// id onto the pending booking inside it. A caller that arrives after the order
/// exists reads that id and returns it rather than booking again. A caller that
/// crashes halfway rolls back, leaving the booking paid and unfulfilled, which the
/// next attempt picks up cleanly.
/// </remarks>
public sealed class PaidBookingFinaliser
{
    private readonly AppDbContext _dbContext;
    private readonly ISender _sender;
    private readonly ILogger<PaidBookingFinaliser> _logger;

    public PaidBookingFinaliser(
        AppDbContext dbContext,
        ISender sender,
        ILogger<PaidBookingFinaliser> logger)
    {
        _dbContext = dbContext;
        _sender = sender;
        _logger = logger;
    }

    public async Task<Result<Guid>> FinaliseAsync(
        PendingBooking pending,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (pending.OrderId is not null)
            return Result<Guid>.Success(pending.OrderId.Value);

        if (pending.Status != PendingBookingStatus.Paid)
            return Result<Guid>.Conflict("This booking has not been paid yet.");

        CreateBookingCommand? command;
        try
        {
            command = JsonSerializer.Deserialize<CreateBookingCommand>(
                pending.PayloadJson, StartBookingCheckoutHandler.SerializerOptions);
        }
        catch (JsonException exception)
        {
            // Money has been taken, so this must be loud rather than swallowed.
            _logger.LogError(
                exception,
                "Paid booking {Reference} could not be read back and needs manual attention.",
                pending.Reference);
            return Result<Guid>.Conflict("The paid booking could not be read back.");
        }

        if (command is null)
            return Result<Guid>.Conflict("The paid booking could not be read back.");

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        // Re-read inside the transaction: a concurrent webhook and status poll can
        // both get this far, and only one of them may create the order.
        var current = await _dbContext.PendingBookings
            .FirstAsync(item => item.Id == pending.Id, cancellationToken);

        if (current.OrderId is not null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return Result<Guid>.Success(current.OrderId.Value);
        }

        var created = await _sender.Send(command, cancellationToken);

        if (!created.IsSuccess)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(
                "Paid booking {Reference} could not be created: {Error}",
                pending.Reference,
                created.Error.Message);
            return Result<Guid>.Conflict(created.Error.Message);
        }

        var orderId = created.Value!.OrderId;

        var order = await _dbContext.LaundryOrders
            .FirstOrDefaultAsync(item => item.Id == orderId, cancellationToken);

        if (order is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return Result<Guid>.Conflict("The paid booking was not stored correctly.");
        }

        // The customer has already paid, so the order starts life settled. This is
        // the only path that may do so for QR: staff cannot mark QR paid by hand.
        var payment = order.SettlePrepaidOnlinePayment(
            pending.PaymentReference ?? pending.Reference,
            pending.Amount,
            ReceiptCode(pending),
            now);

        if (!payment.IsSuccess)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(
                "Paid booking {Reference} created order {OrderCode} but payment could not be recorded: {Error}",
                pending.Reference,
                order.OrderCode,
                payment.Error.Message);
            return Result<Guid>.Conflict(payment.Error.Message);
        }

        var attached = current.AttachOrder(orderId, now);
        if (!attached.IsSuccess)
        {
            await transaction.RollbackAsync(cancellationToken);
            return Result<Guid>.Conflict(attached.Error.Message);
        }

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // The order's payment stamp moved under us, so another caller settled this
            // booking first. Rolled back and reported as a conflict rather than allowed
            // to escape: the caller here may be the payment provider's webhook, and an
            // unhandled exception would answer it with a server error. Repeated
            // failures make the provider disable the endpoint, which would leave later
            // real payments unfulfilled.
            await transaction.RollbackAsync(cancellationToken);
            return Result<Guid>.Conflict("This booking was just settled by another request.");
        }

        return Result<Guid>.Success(orderId);
    }

    private static string ReceiptCode(PendingBooking pending) =>
        $"QR-{pending.Reference}";
}
