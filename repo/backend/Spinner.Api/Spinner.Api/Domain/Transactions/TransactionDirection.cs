namespace Spinner.Api.Domain.Transactions;

/// <summary>
/// Whether money came in or went out.
/// </summary>
/// <remarks>
/// The owner's own filters are "Income" and "Deduction", which is a direction rather
/// than a kind: income covers manual income and both kinds of sale, while a deduction
/// is only ever a deduction. Expressing it here lets that filter be applied in the
/// database. It used to be resolved in the app, over a full local copy of the shop's
/// transaction history.
/// </remarks>
public enum TransactionDirection
{
    In,
    Out
}
