namespace Spinner.Api.Common.Security;

/// <summary>
/// Named authorization policies.
/// </summary>
/// <remarks>
/// Before these existed the API only ever checked that a caller was signed in, so
/// any account could reach settings, pricing, reports and staff administration. The
/// distinction that matters in a laundromat is between the owner, who sets prices
/// and sees the books, and staff, who run the day's work.
/// </remarks>
public static class AuthorizationPolicies
{
    /// <summary>Owner only: pricing, business settings, reports, staff accounts.</summary>
    public const string OwnerOnly = "OwnerOnly";

    /// <summary>Any signed-in member of the shop. The default for day-to-day work.</summary>
    public const string StaffOrOwner = "StaffOrOwner";
}
