using FluentValidation;

namespace Spinner.Api.Features.Auth.ResendVerification;

public sealed class ResendVerificationValidator
    : AbstractValidator<ResendVerificationCommand>
{
    public ResendVerificationValidator()
    {
        RuleFor(command => command.EmailAddress)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(254);
    }
}
