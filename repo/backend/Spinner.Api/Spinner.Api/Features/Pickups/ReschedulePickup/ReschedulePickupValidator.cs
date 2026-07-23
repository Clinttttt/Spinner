using FluentValidation;

namespace Spinner.Api.Features.Pickups.ReschedulePickup;

public sealed class ReschedulePickupValidator : AbstractValidator<ReschedulePickupCommand>
{
    public ReschedulePickupValidator()
    {
        RuleFor(command => command.OrderId).NotEmpty();
        RuleFor(command => command.PreferredDate).NotEmpty();
        RuleFor(command => command.PreferredTimeWindow).NotEmpty().MaximumLength(120);
    }
}
