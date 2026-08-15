using System.Text;
using Spinner.Api.Integrations.Media;

namespace Spinner.Test.Features.Media;

/// <summary>
/// Stands in for R2 so the feature's own rules can be tested without a network call.
/// </summary>
/// <remarks>
/// It also records what it was asked to do, which is how the tests check the things that
/// matter most about this slice: that a key is never taken from the caller, and that nothing
/// reaches storage when a rule has already refused it.
/// </remarks>
internal sealed class FakeMediaStorage : IMediaStorage
{
    private readonly Dictionary<string, (byte[] Content, string ContentType)> _objects = new(StringComparer.Ordinal);

    public FakeMediaStorage(bool isConfigured = true)
    {
        IsConfigured = isConfigured;
    }

    public bool IsConfigured { get; }

    public List<string> SavedKeys { get; } = [];

    public List<string> OpenedKeys { get; } = [];

    public Task<StoredMedia> SaveAsync(
        string key,
        byte[] content,
        string contentType,
        CancellationToken cancellationToken)
    {
        SavedKeys.Add(key);
        _objects[key] = (content, contentType);

        return Task.FromResult(new StoredMedia(key, contentType, content.Length));
    }

    public Task<MediaContent?> OpenAsync(string key, CancellationToken cancellationToken)
    {
        OpenedKeys.Add(key);

        if (!_objects.TryGetValue(key, out var stored))
            return Task.FromResult<MediaContent?>(null);

        return Task.FromResult<MediaContent?>(new MediaContent(
            new MemoryStream(stored.Content, writable: false),
            stored.ContentType,
            stored.Content.Length,
            "\"fake-etag\""));
    }

    public List<string> DeletedKeys { get; } = [];

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        DeletedKeys.Add(key);
        _objects.Remove(key);
        return Task.CompletedTask;
    }
    /// <summary>Puts an object in place without going through the upload rules.</summary>
    public void Seed(string key, string contentType, string content = "image bytes") =>
        _objects[key] = (Encoding.UTF8.GetBytes(content), contentType);
}
