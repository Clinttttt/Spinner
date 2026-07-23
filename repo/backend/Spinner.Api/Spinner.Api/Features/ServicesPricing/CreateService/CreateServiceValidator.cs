using FluentValidation;

namespace Spinner.Api.Features.ServicesPricing.CreateService;

public sealed class CreateServiceValidator : AbstractValidator<CreateServiceCommand>
{
    public CreateServiceValidator()
    {
        RuleFor(command => command.Name)
            .NotEmpty()
            .MaximumLength(160);

        RuleFor(command => command.Description)
            .MaximumLength(500);

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
