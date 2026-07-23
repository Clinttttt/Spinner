using FluentValidation;

namespace Spinner.Api.Features.Auth.RefreshSession;

public sealed class RefreshSessionValidator
    : AbstractValidator<RefreshSessionCommand>
{
    public RefreshSessionValidator()
    {
        RuleFor(command => command.RefreshToken)
            .NotEmpty()
            .MaximumLength(1000);
    }
}
