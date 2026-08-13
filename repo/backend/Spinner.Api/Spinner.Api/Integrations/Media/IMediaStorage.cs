namespace Spinner.Api.Integrations.Media;

/// <summary>An object that was stored, and the key it can be read back with.</summary>
public sealed record StoredMedia(string Key, string ContentType, long ByteSize);

/// <summary>
/// An object being read back. The caller owns <see cref="Content"/> and must dispose it.
/// </summary>
public sealed record MediaContent(Stream Content, string ContentType, long? ByteSize, string? ETag);

/// <summary>
/// Stores and retrieves uploaded images.
/// </summary>
/// <remarks>
/// Behind an interface for the same reason the payment gateway is: the shop can run with
/// image storage switched off, in which case an upload is refused with a clear message
/// rather than failing somewhere deeper, and the provider can be replaced without the
/// feature slices knowing.
/// </remarks>
public interface IMediaStorage
{
    /// <summary>True when the deployment has credentials to store images.</summary>
    bool IsConfigured { get; }

    Task<StoredMedia> SaveAsync(
        string key,
        byte[] content,
        string contentType,
        CancellationToken cancellationToken);

    /// <summary>
    /// Opens a stored object, or returns null when there is no such key.
    /// </summary>
    Task<MediaContent?> OpenAsync(string key, CancellationToken cancellationToken);
}
