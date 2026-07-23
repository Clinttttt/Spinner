using FluentValidation;

namespace Spinner.Api.Features.BusinessSettings.UpdateOperatingHours;

public sealed class UpdateOperatingHoursValidator : AbstractValidator<UpdateOperatingHoursCommand>
{
    public UpdateOperatingHoursValidator()
    {
        RuleFor(command => command.OperatingHours)
            .NotEmpty()
            .MaximumLength(1000);
    }
}
