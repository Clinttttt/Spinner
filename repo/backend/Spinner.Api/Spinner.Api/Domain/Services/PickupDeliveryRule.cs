namespace Spinner.Api.Domain.Services;

/// <summary>
/// Which services can be collected and returned, and how to say so when one cannot.
/// </summary>
/// <remarks>
/// Three places enforce this — a customer booking, that booking's checkout, and an order the
/// shop raises itself — so the wording lives here rather than being written out three times
/// and drifting.
///
/// The message names the offending service. It used to say only that "every selected service
/// must support pickup and delivery", which left whoever hit it to work out which of their
/// choices was at fault. Both front ends now prevent the combination at the point of choosing,
/// so this should be unreachable; it stays as a backstop, and a backstop that cannot explain
/// itself is no use on the day it fires.
/// </remarks>
public static class PickupDeliveryRule
{
    public static IReadOnlyList<string> UndeliverableNames(IEnumerable<LaundryService> services) =>
        services
            .Where(service => !service.SupportsPickupAndDelivery)
            .Select(service => service.Name)
            .ToList();

    public static string Describe(IReadOnlyList<string> names) =>
        names.Count == 1
            ? $"{names[0]} cannot be picked up and delivered. Remove it, or choose drop-off instead."
            : $"{string.Join(", ", names)} cannot be picked up and delivered. Remove them, or choose drop-off instead.";
}
