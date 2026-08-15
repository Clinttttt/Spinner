namespace Spinner.Api.Features.Media;

/// <summary>
/// Names stored objects, and decides whether a key arriving from outside may be read.
/// </summary>
/// <remarks>
/// Keys are generated here rather than taken from the uploader, which settles three things
/// at once. A caller cannot choose a path and so cannot overwrite somebody else's image or
/// reach outside the folders this API uses; a filename from a phone cannot bring odd
/// characters or a misleading second extension along with it; and because every upload gets
/// a fresh name, replacing the logo never changes the bytes behind an address somebody has
/// already cached, so the read endpoint can be cached hard.
///
/// The read side still validates, because the key there comes from the URL. That check is
/// deliberately narrow: a known folder, then plain characters. It is defence in depth rather
/// than the only defence — the S3 API would not honour a traversal attempt either.
/// </remarks>
public static class MediaObjectKey
{
    private const int MaximumLength = 200;

    private static readonly Dictionary<MediaPurpose, string> FoldersByPurpose = new()
    {
        [MediaPurpose.Logo] = "logos",
        [MediaPurpose.ProfilePhoto] = "profile-photos",
    };

    public static string FolderFor(MediaPurpose purpose) =>
        FoldersByPurpose.TryGetValue(purpose, out var folder)
            ? folder
            : throw new ArgumentOutOfRangeException(nameof(purpose), purpose, "Unknown media purpose.");

    /// <summary>Builds a fresh, unguessable key for a new upload.</summary>
    public static string Create(MediaPurpose purpose, string contentType) =>
        $"{FolderFor(purpose)}/{Guid.NewGuid():N}{ImageUploadRules.ExtensionFor(contentType)}";

    /// <summary>
    /// Recovers the storage key from an address this API previously handed out.
    /// </summary>
    /// <remarks>
    /// Used when an image is replaced, so the superseded object can be removed. It returns null
    /// for anything that is not one of our own media addresses, which is the point: the owner may
    /// paste a link to an image hosted anywhere, and this must never be turned into a delete of
    /// something we do not own.
    /// </remarks>
    public static string? ReadKeyFromUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;

        var marker = $"/{MediaRoutes.Base}/";
        var at = url.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (at < 0) return null;

        var key = url[(at + marker.Length)..].Trim();

        // A query string or fragment is not part of the key.
        var cut = key.IndexOfAny(['?', '#']);
        if (cut >= 0) key = key[..cut];

        return IsReadable(key) ? key : null;
    }

    /// <summary>
    /// True when a key may be fetched: one of our folders, then an unremarkable filename.
    /// </summary>
    public static bool IsReadable(string? key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Length > MaximumLength)
            return false;

        // Rejected outright rather than normalised away, so nothing downstream has to
        // decide what a path like "logos/../secret" was supposed to mean.
        if (key.Contains("..", StringComparison.Ordinal) ||
            key.Contains("//", StringComparison.Ordinal) ||
            key.StartsWith('/') ||
            key.EndsWith('/'))
        {
            return false;
        }

        var separator = key.IndexOf('/');
        if (separator <= 0)
            return false;

        var folder = key[..separator];
        if (!FoldersByPurpose.ContainsValue(folder))
            return false;

        var name = key[(separator + 1)..];
        if (name.Length == 0 || name.Contains('/'))
            return false;

        return name.All(character =>
            char.IsAsciiLetterOrDigit(character) ||
            character is '.' or '-' or '_');
    }
}
