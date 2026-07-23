using FluentValidation;
using Spinner.Api.Domain.Orders;

namespace Spinner.Api.Features.ManualOrders.CreateManualOrder;

public sealed class CreateManualOrderValidator : AbstractValidator<CreateManualOrderCommand>
{
    public CreateManualOrderValidator()
    {
        RuleFor(command => command.CustomerName).NotEmpty().MaximumLength(160);
        RuleFor(command => command.MobileNumber).NotEmpty().MaximumLength(40);
        RuleFor(command => command.EmailAddress)
            .EmailAddress()
            .MaximumLength(254)
            .When(command => !string.IsNullOrWhiteSpace(command.EmailAddress));
        RuleFor(command => command.Method).IsInEnum();
        RuleFor(command => command.PaymentMethod).IsInEnum();
        RuleFor(command => command.Address)
            .NotEmpty()
            .MaximumLength(500)
            .When(command => command.Method == FulfillmentType.PickupAndDelivery);
        RuleFor(command => command.ScheduledDate).NotEmpty();
        RuleFor(command => command.ScheduledTime).NotEmpty().MaximumLength(120);
        RuleFor(command => command.Services).NotEmpty();
        RuleForEach(command => command.Services).ChildRules(service =>
        {
            service.RuleFor(item => item.ServiceId).NotEmpty();
            service.RuleFor(item => item.Quantity).GreaterThan(0).LessThanOrEqualTo(100);
        });
        RuleFor(command => command.AdditionalCharge).GreaterThanOrEqualTo(0);
        RuleFor(command => command.AdditionalChargeReason)
            .NotEmpty()
            .MaximumLength(500)
            .When(command => command.AdditionalCharge > 0);
        RuleFor(command => command.Discount).GreaterThanOrEqualTo(0);
        RuleFor(command => command.DiscountReason)
            .NotEmpty()
            .MaximumLength(500)
            .When(command => command.Discount > 0);
        RuleFor(command => command.Notes).MaximumLength(1000);
        RuleFor(command => command.SpecialInstructions).MaximumLength(1000);

        When(command => command.PickupLocation is not null, () =>
        {
            RuleFor(command => command.PickupLocation!.FormattedAddress).NotEmpty().MaximumLength(500);
            RuleFor(command => command.PickupLocation!.Latitude).InclusiveBetween(-90m, 90m);
            RuleFor(command => command.PickupLocation!.Longitude).InclusiveBetween(-180m, 180m);
            RuleFor(command => command.PickupLocation!.LocationSource).NotEmpty().MaximumLength(80);
        });
    }
}
