using FluentValidation;
using Spinner.Api.Domain.Transactions;

namespace Spinner.Api.Features.Transactions.CreateManualTransaction;

public sealed class CreateManualTransactionValidator : AbstractValidator<CreateManualTransactionCommand>
{
    public CreateManualTransactionValidator()
    {
        RuleFor(command => command.Kind)
            .Must(kind => kind is TransactionKind.ManualIncome or TransactionKind.ManualDeduction)
            .WithMessage("Only ManualIncome or ManualDeduction can be added manually.");
        RuleFor(command => command.Amount).GreaterThan(0);
        RuleFor(command => command.Note).MaximumLength(500);
        RuleFor(command => command.OccurredAt).NotEmpty();
    }
}
