using FluentValidation;

namespace Spinner.Api.Features.Auth.RevokeSession;

public sealed class RevokeSessionValidator
    : AbstractValidator<RevokeSessionCommand>
{
    public RevokeSessionValidator()
    {
        RuleFor(command => command.RefreshToken)
            .NotEmpty()
            .MaximumLength(1000);
    }
}
