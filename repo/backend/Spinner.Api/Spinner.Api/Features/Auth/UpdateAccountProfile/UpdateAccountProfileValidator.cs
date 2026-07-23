using FluentValidation;

namespace Spinner.Api.Features.Auth.UpdateAccountProfile;

public sealed class UpdateAccountProfileValidator
    : AbstractValidator<UpdateAccountProfileCommand>
{
    public UpdateAccountProfileValidator()
    {
        RuleFor(command => command.UserId).NotEmpty();
        RuleFor(command => command.FullName).NotEmpty().MaximumLength(160);
        RuleFor(command => command.EmailAddress)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(254);
        RuleFor(command => command.MobileNumber).MaximumLength(40);
    }
}
