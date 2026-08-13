namespace Spinner.Api.Integrations.Media;

/// <summary>
/// Where uploaded images are kept. Cloudflare R2, reached with its S3-compatible API.
/// </summary>
/// <remarks>
/// R2 was chosen because its free allowance (10 GB stored, and no charge for egress at
/// any volume) comfortably covers a shop logo and a photo per staff member, and because
/// it speaks the S3 API so no bespoke client is needed.
///
/// The bucket stays private. Objects are served to the public by this API instead, at
/// /api/media/{key}, for a specific reason: R2's own public access is either the
/// rate-limited r2.dev subdomain, which Cloudflare advises against in production, or a
/// custom domain, which requires the domain's DNS to be hosted at Cloudflare.
/// spinlaundry.online is not — moving it would disturb the api record, the customer
/// site, and the email authentication records, which is a poor trade for an image URL.
/// Serving through the API keeps those URLs on api.spinlaundry.online, which already has
/// a working certificate, and keeps the credentials on the server.
/// </remarks>
public sealed class MediaStorageOptions
{
    public const string SectionName = "MediaStorage";

    /// <summary>
    /// Hard ceiling on the size of an upload request, in bytes.
    /// </summary>
    /// <remarks>
    /// A compile-time constant because it is applied by an attribute on the endpoint, which
    /// refuses an oversized request before any of it is read into memory. It sits above
    /// <see cref="MaxUploadBytes"/> to leave room for the multipart envelope, and startup
    /// checks that the configured limit stays underneath it: a limit the server rejects
    /// before the application can explain itself would give the owner a bare connection
    /// error instead of a sentence telling them the image is too big.
    /// </remarks>
    public const int RequestBodyByteCeiling = 8 * 1024 * 1024;

    /// <summary>Cloudflare account ID, which forms the endpoint hostname.</summary>
    public string AccountId { get; set; } = string.Empty;

    /// <summary>R2 API token Access Key ID.</summary>
    public string AccessKeyId { get; set; } = string.Empty;

    /// <summary>R2 API token Secret Access Key.</summary>
    public string SecretAccessKey { get; set; } = string.Empty;

    public string BucketName { get; set; } = string.Empty;

    /// <summary>
    /// Largest upload accepted, in bytes.
    /// </summary>
    /// <remarks>
    /// A logo or a profile photo has no business being large, and a phone camera will
    /// happily produce something far bigger than either needs to be. The cap is what
    /// stops one careless upload from filling the free allowance.
    /// </remarks>
    public int MaxUploadBytes { get; set; } = 5 * 1024 * 1024;

    /// <summary>
    /// How long a browser or mail client may reuse a fetched image.
    /// </summary>
    /// <remarks>
    /// Long, because every stored object has a unique generated key: replacing a logo
    /// produces a new key rather than new bytes behind the old one, so a cached copy can
    /// never be stale. This also keeps repeat views off R2 entirely, which is what keeps
    /// the read allowance untouched.
    /// </remarks>
    public int CacheMaxAgeSeconds { get; set; } = 31_536_000;

    /// <summary>The S3-compatible endpoint for this account.</summary>
    public string ServiceUrl => $"https://{AccountId}.r2.cloudflarestorage.com";

    /// <summary>
    /// Absolute base address this API is reached at, used to build the URL of a stored image.
    /// </summary>
    /// <remarks>
    /// Configured rather than taken from the incoming request, because a stored logo URL ends
    /// up inside an email. TLS terminates at the container platform's ingress, so the request
    /// this application sees arrives as plain HTTP with an internal host; building an address
    /// from it would put a URL in the shop's receipts that no mail client could fetch.
    ///
    /// Empty is allowed for local development, where the caller's own origin is used instead.
    /// A deployment has to set it.
    /// </remarks>
    public string PublicBaseUrl { get; set; } = string.Empty;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(AccountId) &&
        !string.IsNullOrWhiteSpace(AccessKeyId) &&
        !string.IsNullOrWhiteSpace(SecretAccessKey) &&
        !string.IsNullOrWhiteSpace(BucketName);
}
