using FluentValidation;

namespace Spinner.Api.Features.Auth.ResetPassword;

public sealed class ResetPasswordValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordValidator()
    {
        RuleFor(command => command.Login)
            .NotEmpty()
            .MaximumLength(254);

        RuleFor(command => command.Code)
            .NotEmpty()
            .Matches(@"^\d{6}$")
            .WithMessage("Enter the six-digit password reset code.");

        RuleFor(command => command.NewPassword)
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
            .Equal(command => command.NewPassword)
            .WithMessage("Passwords do not match.");
    }
}
