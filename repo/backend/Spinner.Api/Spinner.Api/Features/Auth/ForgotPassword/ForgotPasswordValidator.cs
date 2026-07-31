using FluentValidation;

namespace Spinner.Api.Features.Auth.ForgotPassword;

public sealed class ForgotPasswordValidator
    : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordValidator()
    {
        RuleFor(command => command.Login)
            .NotEmpty()
            .MaximumLength(254);
    }
}
