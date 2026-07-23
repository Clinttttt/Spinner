using FluentValidation;

namespace Spinner.Api.Features.BusinessSettings.UpdatePickupTimes;

public sealed class UpdatePickupTimesValidator : AbstractValidator<UpdatePickupTimesCommand>
{
    public UpdatePickupTimesValidator()
    {
        RuleFor(command => command.PickupTimeWindows)
            .NotEmpty()
            .MaximumLength(1000);
    }
}
