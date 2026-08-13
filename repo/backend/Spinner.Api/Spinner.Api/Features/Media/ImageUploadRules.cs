namespace Spinner.Api.Features.Media;

/// <summary>What an uploaded image is for, which decides where it is filed.</summary>
public enum MediaPurpose
{
    /// <summary>The shop's logo, shown in the app header and on emails.</summary>
    Logo = 1,

    /// <summary>A photo of the owner or a staff member, shown on their profile.</summary>
    ProfilePhoto = 2
}

/// <summary>
/// The image formats this API accepts, and how it satisfies itself that an upload really
/// is one of them.
/// </summary>
/// <remarks>
/// A declared content type is only what the caller claims. It matters here because these
/// bytes are later served back from api.spinlaundry.online, so anything stored is served
/// from the shop's own origin — and a file that a browser decides is HTML rather than an
/// image is then a script running with the API's origin behind it. So the leading bytes
/// are checked against the format's actual signature before anything is stored.
///
/// SVG is deliberately absent. It is a legitimate logo format, but an SVG is a document
/// that may contain script, and serving one from our own origin is the exact problem
/// described above with no way to check for it by looking at a few bytes.
/// </remarks>
public static class ImageUploadRules
{
    public const string Png = "image/png";
    public const string Jpeg = "image/jpeg";
    public const string Webp = "image/webp";

    /// <summary>Smallest upload worth storing. Below this it cannot be a real image.</summary>
    public const int MinimumByteSize = 64;

    private static readonly Dictionary<string, string> ExtensionsByContentType =
        new(StringComparer.OrdinalIgnoreCase)
        {
            [Png] = ".png",
            [Jpeg] = ".jpg",
            [Webp] = ".webp",
        };

    /// <summary>The accepted types, for error messages and for the HTTP accept list.</summary>
    public static IReadOnlyCollection<string> AcceptedContentTypes => ExtensionsByContentType.Keys;

    public static string Describe() => string.Join(", ", ExtensionsByContentType.Keys);

    /// <summary>
    /// Normalises a request's content type, discarding any parameters such as a charset.
    /// </summary>
    public static string Normalise(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
            return string.Empty;

        var separator = contentType.IndexOf(';');
        var value = separator >= 0 ? contentType[..separator] : contentType;

        return value.Trim().ToLowerInvariant();
    }

    public static bool IsAccepted(string? contentType) =>
        ExtensionsByContentType.ContainsKey(Normalise(contentType));

    public static string ExtensionFor(string contentType) =>
        ExtensionsByContentType.TryGetValue(Normalise(contentType), out var extension)
            ? extension
            : throw new ArgumentOutOfRangeException(
                nameof(contentType),
                contentType,
                "Not an accepted image content type.");

    /// <summary>
    /// True when the bytes actually begin the way the declared format does.
    /// </summary>
    public static bool MatchesSignature(string contentType, ReadOnlySpan<byte> content) =>
        Normalise(contentType) switch
        {
            // 89 'P' 'N' 'G' CR LF SUB LF
            Png => StartsWith(content, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),

            // Start of Image, then the first marker. Covers JFIF and Exif alike.
            Jpeg => StartsWith(content, [0xFF, 0xD8, 0xFF]),

            // A RIFF container whose form type is WEBP: "RIFF" ???? "WEBP".
            Webp => content.Length >= 12 &&
                    StartsWith(content, "RIFF"u8) &&
                    content[8..12].SequenceEqual("WEBP"u8),

            _ => false
        };

    private static bool StartsWith(ReadOnlySpan<byte> content, ReadOnlySpan<byte> prefix) =>
        content.Length >= prefix.Length && content[..prefix.Length].SequenceEqual(prefix);
}
