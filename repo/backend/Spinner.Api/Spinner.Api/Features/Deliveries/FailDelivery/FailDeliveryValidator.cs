using FluentValidation;

namespace Spinner.Api.Features.Deliveries.FailDelivery;

public sealed class FailDeliveryValidator : AbstractValidator<FailDeliveryCommand>
{
    public FailDeliveryValidator()
    {
        RuleFor(command => command.OrderId).NotEmpty();
        RuleFor(command => command.Reason).NotEmpty().MaximumLength(500);
    }
}
