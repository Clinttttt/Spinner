using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Spinner.Api.Common.Security;
using Spinner.Api.Features.Media;
using Spinner.Api.Features.Media.GetMedia;
using Spinner.Api.Features.Media.UploadMedia;
using Spinner.Api.Integrations.Media;

namespace Spinner.Api.Controllers;

/// <summary>
/// Uploading and serving the shop's images.
/// </summary>
/// <remarks>
/// The two upload routes are separate rather than one route taking the purpose as a field,
/// so that who may do what is expressed the way the rest of this API expresses it — with a
/// policy on the endpoint. The shop's logo is the owner's to change; a profile photo is the
/// staff member's own, and locking that to the owner would mean asking the owner to set
/// everybody's picture for them.
/// </remarks>
[Route(MediaRoutes.Base)]
public sealed class MediaController : ApiControllerBase
{
    public MediaController(ISender sender)
        : base(sender)
    {
    }

    /// <summary>Replaces the shop's logo.</summary>
    [HttpPost("logo")]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MediaStorageOptions.RequestBodyByteCeiling)]
    public Task<ActionResult<UploadedMediaResponse>> UploadLogo(
        [FromForm] IFormFile file,
        CancellationToken ct) =>
        Upload(MediaPurpose.Logo, file, ct);

    /// <summary>Sets the signed-in person's profile photo.</summary>
    [HttpPost("profile-photo")]
    [Authorize(Policy = AuthorizationPolicies.StaffOrOwner)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MediaStorageOptions.RequestBodyByteCeiling)]
    public Task<ActionResult<UploadedMediaResponse>> UploadProfilePhoto(
        [FromForm] IFormFile file,
        CancellationToken ct) =>
        Upload(MediaPurpose.ProfilePhoto, file, ct);

    /// <summary>
    /// Serves a stored image.
    /// </summary>
    /// <remarks>
    /// Anonymous on purpose: these addresses appear in emails, and a mail client cannot
    /// authenticate. See <see cref="GetMediaHandler"/>.
    ///
    /// This is the one endpoint that does not go through HandleResponse, because the response
    /// is an image rather than a JSON payload. A failure is always 404 — there is nothing
    /// useful or safe to tell an anonymous caller about a key that did not work.
    /// </remarks>
    [HttpGet("{*key}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.PublicMedia)]
    public async Task<IActionResult> Get(string key, CancellationToken ct)
    {
        var result = await Sender.Send(new GetMediaQuery(key), ct);

        if (!result.IsSuccess || result.Value is null)
            return NotFound();

        var file = result.Value;

        Response.Headers.CacheControl =
            $"public, max-age={file.CacheMaxAgeSeconds}, immutable";

        if (!string.IsNullOrWhiteSpace(file.ETag))
            Response.Headers.ETag = file.ETag;

        // File() takes ownership of the stream and disposes it once written.
        return File(file.Content, file.ContentType);
    }

    /// <summary>
    /// Reads the posted file into memory and hands it to the feature.
    /// </summary>
    /// <remarks>
    /// Size is guarded twice, at two different levels. The attribute on each endpoint refuses
    /// an oversized request outright, before a byte is read. The validator then applies the
    /// shop's configured limit, which is what produces a sentence the owner can act on. Both
    /// are needed: the first protects the process, the second explains itself.
    /// </remarks>
    private async Task<ActionResult<UploadedMediaResponse>> Upload(
        MediaPurpose purpose,
        IFormFile? file,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Choose an image to upload." });

        using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer, ct);

        var result = await Sender.Send(
            new UploadMediaCommand(
                purpose,
                buffer.ToArray(),
                file.ContentType,
                $"{Request.Scheme}://{Request.Host}"),
            ct);

        return HandleResponse(result);
    }
}
