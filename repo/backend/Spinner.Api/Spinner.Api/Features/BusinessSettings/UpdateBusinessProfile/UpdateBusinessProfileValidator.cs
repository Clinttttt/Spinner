using FluentValidation;

namespace Spinner.Api.Features.BusinessSettings.UpdateBusinessProfile;

public sealed class UpdateBusinessProfileValidator : AbstractValidator<UpdateBusinessProfileCommand>
{
    public UpdateBusinessProfileValidator()
    {
        RuleFor(command => command.BusinessName)
            .NotEmpty()
            .MaximumLength(160);

        RuleFor(command => command.LogoUrl)
            .MaximumLength(500);

        RuleFor(command => command.PhoneNumber)
            .NotEmpty()
            .MaximumLength(40);

        RuleFor(command => command.Address)
            .NotEmpty()
            .MaximumLength(500);
    }
}
