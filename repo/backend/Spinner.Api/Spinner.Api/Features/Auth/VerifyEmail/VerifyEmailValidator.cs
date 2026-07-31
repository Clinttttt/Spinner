using FluentValidation;

namespace Spinner.Api.Features.Auth.VerifyEmail;

public sealed class VerifyEmailValidator : AbstractValidator<VerifyEmailCommand>
{
    public VerifyEmailValidator()
    {
        RuleFor(command => command.EmailAddress)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(254);

        RuleFor(command => command.Code)
            .NotEmpty()
            .Matches(@"^\d{6}$")
            .WithMessage("Enter the six-digit verification code.");
    }
}
