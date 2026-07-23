using FluentValidation;

namespace Spinner.Api.Features.Bookings.RescheduleBooking;

public sealed class RescheduleBookingValidator : AbstractValidator<RescheduleBookingCommand>
{
    public RescheduleBookingValidator()
    {
        RuleFor(command => command.BookingId).NotEmpty();
        RuleFor(command => command.PreferredDate).NotEmpty();
        RuleFor(command => command.PreferredTimeWindow).NotEmpty().MaximumLength(120);
    }
}
