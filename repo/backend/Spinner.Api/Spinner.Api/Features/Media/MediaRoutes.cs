namespace Spinner.Api.Features.Media;

/// <summary>
/// The one place that knows where media is served from.
/// </summary>
/// <remarks>
/// The controller route and the URL written into the shop's settings have to agree forever:
/// a stored logo URL outlives any deployment, and an email already sent cannot be corrected.
/// Keeping both derived from here means renaming the route cannot silently break addresses
/// that are already out in the world.
/// </remarks>
public static class MediaRoutes
{
    public const string Base = "api/media";

    public static string PathFor(string key) => $"/{Base}/{key}";
}
