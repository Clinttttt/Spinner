using FluentValidation;

namespace Spinner.Api.Features.ServicesPricing.UpdatePricing;

public sealed class UpdatePricingValidator : AbstractValidator<UpdatePricingCommand>
{
    public UpdatePricingValidator()
    {
        RuleFor(command => command.ServiceId)
            .NotEmpty();

        RuleFor(command => command.UnitLabel)
            .NotEmpty()
            .MaximumLength(80);

        RuleFor(command => command.BasePrice)
            .GreaterThanOrEqualTo(0);

        RuleFor(command => command.DeliveryFee)
            .GreaterThanOrEqualTo(0)
            .When(command => command.DeliveryFee.HasValue);
    }
}
