using FluentValidation;

namespace Spinner.Api.Features.Pickups.FailPickup;

public sealed class FailPickupValidator : AbstractValidator<FailPickupCommand>
{
    public FailPickupValidator()
    {
        RuleFor(command => command.OrderId).NotEmpty();
        RuleFor(command => command.Reason).NotEmpty().MaximumLength(500);
    }
}
