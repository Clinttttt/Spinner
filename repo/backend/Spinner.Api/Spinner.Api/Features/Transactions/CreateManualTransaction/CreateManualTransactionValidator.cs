using FluentValidation;
using Spinner.Api.Domain.Transactions;

namespace Spinner.Api.Features.Transactions.CreateManualTransaction;

public sealed class CreateManualTransactionValidator : AbstractValidator<CreateManualTransactionCommand>
{
    /// <summary>
    /// How far back a manual entry may be dated.
    /// </summary>
    /// <remarks>
    /// Back-dating is a real need: an expense is often entered the next morning. Unbounded
    /// back-dating is something else, because the date decides which day's takings and which
    /// report an entry lands in, so an arbitrary date rewrites figures that have already been
    /// read. Three months covers catching up on paperwork and stops there.
    /// </remarks>
    private const int MaximumBackdateDays = 90;

    /// <summary>
    /// Tolerance for the phone's clock running ahead of the server's.
    /// </summary>
    private static readonly TimeSpan FutureTolerance = TimeSpan.FromMinutes(5);

    public CreateManualTransactionValidator()
    {
        RuleFor(command => command.Kind)
            .Must(kind => kind is TransactionKind.ManualIncome or TransactionKind.ManualDeduction)
            .WithMessage("Only ManualIncome or ManualDeduction can be added manually.");
        RuleFor(command => command.Amount).GreaterThan(0);
        RuleFor(command => command.Note).MaximumLength(500);
        RuleFor(command => command.OccurredAt).NotEmpty();

        // The app already refuses a future date on the screen. Enforced here as well
        // because the screen is not the only way to reach this endpoint, and a date in the
        // future would sit in the ledger claiming money that has not arrived.
        RuleFor(command => command.OccurredAt)
            .Must(occurredAt => occurredAt <= DateTimeOffset.UtcNow.Add(FutureTolerance))
            .WithMessage("A transaction cannot be dated in the future.");

        RuleFor(command => command.OccurredAt)
            .Must(occurredAt => occurredAt >= DateTimeOffset.UtcNow.AddDays(-MaximumBackdateDays))
            .WithMessage($"A transaction cannot be dated more than {MaximumBackdateDays} days ago.");
    }
}
