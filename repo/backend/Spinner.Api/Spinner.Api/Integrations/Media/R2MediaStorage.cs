using System.Net;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace Spinner.Api.Integrations.Media;

/// <summary>
/// Stores images in Cloudflare R2 over its S3-compatible API.
/// </summary>
/// <remarks>
/// Two settings here are not optional and are easy to get wrong, so they are spelled out:
///
/// ForcePathStyle. Requests must address the bucket in the path
/// (https://ACCOUNT.r2.cloudflarestorage.com/BUCKET/KEY). Left to itself the SDK would put
/// the bucket in the hostname instead, which is not how the R2 endpoint is reached.
///
/// DisablePayloadSigning and DisableDefaultChecksumValidation. Cloudflare documents both as
/// required, because R2 does not support the streaming SigV4 signing that AWSSDK.S3 uses by
/// default. Without them an upload is rejected by the service rather than by anything here,
/// which makes for a confusing failure.
///
/// The client is created once and reused: it holds a connection pool, and building one per
/// request is the standard way to exhaust sockets under load.
/// </remarks>
public sealed class R2MediaStorage : IMediaStorage, IDisposable
{
    private readonly MediaStorageOptions _options;
    private readonly ILogger<R2MediaStorage> _logger;
    private readonly Lazy<IAmazonS3>? _client;

    public R2MediaStorage(
        IOptions<MediaStorageOptions> options,
        ILogger<R2MediaStorage> logger)
    {
        _options = options.Value;
        _logger = logger;

        if (_options.IsConfigured)
            _client = new Lazy<IAmazonS3>(CreateClient, isThreadSafe: true);
    }

    public bool IsConfigured => _options.IsConfigured;

    public async Task<StoredMedia> SaveAsync(
        string key,
        byte[] content,
        string contentType,
        CancellationToken cancellationToken)
    {
        var client = RequireClient();

        using var payload = new MemoryStream(content, writable: false);

        var request = new PutObjectRequest
        {
            BucketName = _options.BucketName,
            Key = key,
            InputStream = payload,
            ContentType = contentType,
            DisablePayloadSigning = true,
            DisableDefaultChecksumValidation = true,
        };

        await client.PutObjectAsync(request, cancellationToken);

        _logger.LogInformation(
            "Stored media object {Key} ({ByteSize} bytes, {ContentType}).",
            key,
            content.Length,
            contentType);

        return new StoredMedia(key, contentType, content.Length);
    }

    public async Task<MediaContent?> OpenAsync(string key, CancellationToken cancellationToken)
    {
        var client = RequireClient();

        try
        {
            var response = await client.GetObjectAsync(
                _options.BucketName,
                key,
                cancellationToken);

            return new MediaContent(
                response.ResponseStream,
                // R2 returns what was stored. The fallback only matters for an object put
                // there by something other than this API.
                string.IsNullOrWhiteSpace(response.Headers.ContentType)
                    ? "application/octet-stream"
                    : response.Headers.ContentType,
                response.Headers.ContentLength >= 0 ? response.Headers.ContentLength : null,
                response.ETag);
        }
        catch (AmazonS3Exception exception)
            when (exception.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden)
        {
            // A missing key is an ordinary outcome: an old URL, or a typo. Forbidden is
            // treated the same way because a bucket scoped token reports some absent keys
            // that way, and either way the caller has nothing to fetch.
            return null;
        }
    }

    private IAmazonS3 RequireClient() =>
        _client?.Value ?? throw new InvalidOperationException(
            "Media storage is not configured. Check that MediaStorage:AccountId, " +
            "AccessKeyId, SecretAccessKey and BucketName are all set.");

    private IAmazonS3 CreateClient() =>
        new AmazonS3Client(
            new BasicAWSCredentials(_options.AccessKeyId, _options.SecretAccessKey),
            new AmazonS3Config
            {
                ServiceURL = _options.ServiceUrl,
                ForcePathStyle = true,
                // R2 is one global namespace and has no regions of its own, but the SigV4
                // signature has to name one. Cloudflare's is "auto".
                AuthenticationRegion = "auto",
            });

    public void Dispose()
    {
        if (_client is { IsValueCreated: true })
            _client.Value.Dispose();
    }
}
