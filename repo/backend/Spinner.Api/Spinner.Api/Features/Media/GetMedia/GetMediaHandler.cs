using MediatR;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Integrations.Media;

namespace Spinner.Api.Features.Media.GetMedia;

/// <summary>
/// Serves a stored image to anyone who has its address.
/// </summary>
/// <remarks>
/// Deliberately anonymous. These URLs are put in emails and rendered by mail clients, which
/// have no session and cannot be given one, so a logo behind authentication would simply
/// never appear. Nothing here is private: the shop's own logo, and profile photos that staff
/// choose to upload. Nothing else in the bucket is reachable, because the key has to name one
/// of this API's own folders.
///
/// Everything that cannot be served answers 404, whether the key was malformed, absent, or
/// storage is switched off. On an endpoint the whole internet can reach, distinguishing "that
/// is not a valid key" from "that key does not exist" only helps somebody mapping the bucket.
/// </remarks>
public sealed class GetMediaHandler : IRequestHandler<GetMediaQuery, Result<MediaFileResult>>
{
    private const string NotFoundMessage = "That image could not be found.";

    private readonly IMediaStorage _storage;
    private readonly MediaStorageOptions _options;

    public GetMediaHandler(IMediaStorage storage, IOptions<MediaStorageOptions> options)
    {
        _storage = storage;
        _options = options.Value;
    }

    public async Task<Result<MediaFileResult>> Handle(
        GetMediaQuery request,
        CancellationToken cancellationToken)
    {
        if (!_storage.IsConfigured || !MediaObjectKey.IsReadable(request.Key))
            return Result<MediaFileResult>.NotFound(NotFoundMessage);

        var content = await _storage.OpenAsync(request.Key, cancellationToken);

        if (content is null)
            return Result<MediaFileResult>.NotFound(NotFoundMessage);

        return Result<MediaFileResult>.Success(new MediaFileResult(
            content.Content,
            content.ContentType,
            content.ETag,
            _options.CacheMaxAgeSeconds));
    }
}
