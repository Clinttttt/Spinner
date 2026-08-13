using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Media.GetMedia;

public sealed record GetMediaQuery(string Key) : IRequest<Result<MediaFileResult>>;

/// <summary>
/// A stored image ready to be written to the response.
/// </summary>
/// <param name="Content">Streamed straight through, so a large file is never held in memory.</param>
/// <param name="CacheMaxAgeSeconds">
/// Carried here rather than read in the controller so the caching decision stays with the
/// feature, next to the reasoning about why keys are unique per upload.
/// </param>
public sealed record MediaFileResult(
    Stream Content,
    string ContentType,
    string? ETag,
    int CacheMaxAgeSeconds);
