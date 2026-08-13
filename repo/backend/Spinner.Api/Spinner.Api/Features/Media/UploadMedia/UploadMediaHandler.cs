using MediatR;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Integrations.Media;

namespace Spinner.Api.Features.Media.UploadMedia;

public sealed class UploadMediaHandler
    : IRequestHandler<UploadMediaCommand, Result<UploadedMediaResponse>>
{
    private readonly IMediaStorage _storage;
    private readonly MediaStorageOptions _options;

    public UploadMediaHandler(IMediaStorage storage, IOptions<MediaStorageOptions> options)
    {
        _storage = storage;
        _options = options.Value;
    }

    public async Task<Result<UploadedMediaResponse>> Handle(
        UploadMediaCommand request,
        CancellationToken cancellationToken)
    {
        if (!_storage.IsConfigured)
        {
            // Said plainly, because the person reading it is the shop owner rather than
            // whoever deploys this.
            return Result<UploadedMediaResponse>.Failure(
                "Image uploads are not available on this deployment yet. " +
                "You can still set a logo by pasting a link to one.");
        }

        var contentType = ImageUploadRules.Normalise(request.ContentType);

        // The declared type passed validation; this checks the file is what it claims. Done
        // here rather than in the validator because it is about the content, and because a
        // caller sending a mislabelled file deserves a message about the file, not the field.
        if (!ImageUploadRules.MatchesSignature(contentType, request.Content))
        {
            return Result<UploadedMediaResponse>.Validation(
                "That file does not look like the image type it claims to be. " +
                "Choose a PNG, JPEG or WebP image.");
        }

        var key = MediaObjectKey.Create(request.Purpose, contentType);

        var stored = await _storage.SaveAsync(key, request.Content, contentType, cancellationToken);

        return Result<UploadedMediaResponse>.Success(new UploadedMediaResponse(
            stored.Key,
            BuildUrl(stored.Key, request.RequestOrigin),
            stored.ContentType,
            stored.ByteSize));
    }

    /// <summary>
    /// Builds the address the image will be fetched from, preferring the configured one.
    /// </summary>
    private string BuildUrl(string key, string? requestOrigin)
    {
        var origin = string.IsNullOrWhiteSpace(_options.PublicBaseUrl)
            ? requestOrigin?.TrimEnd('/') ?? string.Empty
            : _options.PublicBaseUrl.TrimEnd('/');

        return $"{origin}{MediaRoutes.PathFor(key)}";
    }
}
