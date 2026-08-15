using Spinner.Api.Integrations.Media;

namespace Spinner.Api.Features.Media;

/// <summary>
/// Removes an image that has just been replaced.
/// </summary>
/// <remarks>
/// Every upload is stored under a fresh key, so replacing a logo or a photo never overwrites the
/// old bytes — which is deliberate, because it means a cached copy can never be stale. The cost
/// is that the previous object would otherwise stay in the bucket for ever, quietly consuming the
/// storage allowance.
///
/// Two rules make this safe. Only an address this API itself handed out is ever deleted, so the
/// owner pasting a link to an image hosted elsewhere cannot turn into a delete of somebody else's
/// file. And a failure is logged and swallowed: housekeeping must never fail the save that the
/// owner was actually asking for.
/// </remarks>
public static class MediaCleanup
{
    public static async Task RemoveSupersededAsync(
        IMediaStorage storage,
        ILogger logger,
        string? previousUrl,
        string? currentUrl,
        CancellationToken cancellationToken)
    {
        if (!storage.IsConfigured) return;

        var previousKey = MediaObjectKey.ReadKeyFromUrl(previousUrl);
        if (previousKey is null) return;

        // Unchanged, or changed back to the same image. Nothing has been superseded.
        if (previousKey == MediaObjectKey.ReadKeyFromUrl(currentUrl)) return;

        try
        {
            await storage.DeleteAsync(previousKey, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Could not remove the superseded image {Key}. It remains in storage.",
                previousKey);
        }
    }
}
