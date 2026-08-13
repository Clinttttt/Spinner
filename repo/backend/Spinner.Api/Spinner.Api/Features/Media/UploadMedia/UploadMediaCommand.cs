using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Media.UploadMedia;

/// <summary>
/// Stores an uploaded image and returns the address it can be fetched from.
/// </summary>
/// <param name="Purpose">Decides which folder the image is filed under.</param>
/// <param name="Content">
/// The whole image in memory. Safe because the request size is capped well below anything
/// that would trouble the process, and it lets the handler check the file's signature and
/// hand the same bytes to storage without a stream that can only be read once.
/// </param>
/// <param name="ContentType">As declared by the caller, and verified against the bytes.</param>
/// <param name="RequestOrigin">
/// Used to build the returned URL only when no public base address is configured, which is
/// the local development case.
/// </param>
public sealed record UploadMediaCommand(
    MediaPurpose Purpose,
    byte[] Content,
    string ContentType,
    string? RequestOrigin) : IRequest<Result<UploadedMediaResponse>>;
