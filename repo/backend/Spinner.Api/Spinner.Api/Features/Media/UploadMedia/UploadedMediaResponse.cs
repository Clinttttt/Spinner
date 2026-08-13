namespace Spinner.Api.Features.Media.UploadMedia;

/// <summary>
/// Where a freshly stored image now lives.
/// </summary>
/// <param name="Key">The object's name in storage.</param>
/// <param name="Url">
/// The absolute address to save and display. This is what goes into the shop's logo setting
/// or a staff profile, so it has to be fetchable by a mail client with no session.
/// </param>
public sealed record UploadedMediaResponse(
    string Key,
    string Url,
    string ContentType,
    long ByteSize);
