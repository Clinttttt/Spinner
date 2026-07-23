using FluentValidation;

namespace Spinner.Api.Features.Orders.UpdateOrderStatus;

public sealed class UpdateOrderStatusValidator : AbstractValidator<UpdateOrderStatusCommand>
{
    public UpdateOrderStatusValidator()
    {
        RuleFor(command => command.OrderId).NotEmpty();
    }
}
