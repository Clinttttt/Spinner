using FluentValidation;

namespace Spinner.Api.Features.Auth.Register;

public sealed class RegisterValidator : AbstractValidator<RegisterCommand>
{
    public RegisterValidator()
    {
        RuleFor(command => command.FullName)
            .NotEmpty()
            .MinimumLength(2)
            .MaximumLength(160);

        RuleFor(command => command.EmailAddress)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(254);

        RuleFor(command => command.MobileNumber)
            .NotEmpty()
            .MinimumLength(7)
            .MaximumLength(40)
            .Matches(@"^\+?[0-9][0-9\s-]*$")
            .WithMessage("Enter a valid mobile number.");

        RuleFor(command => command.Password)
            .NotEmpty()
            .MinimumLength(10)
            .MaximumLength(128)
            .Matches("[a-z]")
            .WithMessage("Password must contain a lowercase letter.")
            .Matches("[A-Z]")
            .WithMessage("Password must contain an uppercase letter.")
            .Matches("[0-9]")
            .WithMessage("Password must contain a number.");

        RuleFor(command => command.ConfirmPassword)
            .Equal(command => command.Password)
            .WithMessage("Passwords do not match.");
    }
}
