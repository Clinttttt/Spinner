using System.Text;
using Spinner.Api.Features.Media;

namespace Spinner.Test.Features.Media;

public sealed class ImageUploadRulesTests
{
    [Theory]
    [InlineData("image/png")]
    [InlineData("image/jpeg")]
    [InlineData("image/webp")]
    [InlineData("IMAGE/PNG")]
    [InlineData("image/png; charset=binary")]
    public void IsAccepted_Should_Allow_The_Supported_Image_Types(string contentType)
    {
        Assert.True(ImageUploadRules.IsAccepted(contentType));
    }

    [Theory]
    [InlineData("image/svg+xml")]
    [InlineData("image/gif")]
    [InlineData("text/html")]
    [InlineData("application/pdf")]
    [InlineData("application/octet-stream")]
    [InlineData("")]
    [InlineData(null)]
    public void IsAccepted_Should_Refuse_Everything_Else(string? contentType)
    {
        // SVG is the one worth stating outright: it is a real logo format, and it is refused
        // because an SVG can carry script and these files are served from our own origin.
        Assert.False(ImageUploadRules.IsAccepted(contentType));
    }

    [Fact]
    public void Normalise_Should_Discard_Parameters_And_Case()
    {
        Assert.Equal("image/jpeg", ImageUploadRules.Normalise(" IMAGE/JPEG ; charset=utf-8 "));
    }

    [Fact]
    public void ExtensionFor_Should_Map_Each_Accepted_Type()
    {
        Assert.Equal(".png", ImageUploadRules.ExtensionFor("image/png"));
        Assert.Equal(".jpg", ImageUploadRules.ExtensionFor("image/jpeg"));
        Assert.Equal(".webp", ImageUploadRules.ExtensionFor("image/webp"));
    }

    [Fact]
    public void MatchesSignature_Should_Accept_Real_Headers()
    {
        Assert.True(ImageUploadRules.MatchesSignature("image/png", TestImages.Png()));
        Assert.True(ImageUploadRules.MatchesSignature("image/jpeg", TestImages.Jpeg()));
        Assert.True(ImageUploadRules.MatchesSignature("image/webp", TestImages.Webp()));
    }

    [Fact]
    public void MatchesSignature_Should_Refuse_A_File_Pretending_To_Be_Another_Type()
    {
        // The whole point of the check. A JPEG relabelled as a PNG is harmless; the case that
        // matters is the one below, where the bytes are not an image at all.
        Assert.False(ImageUploadRules.MatchesSignature("image/png", TestImages.Jpeg()));
        Assert.False(ImageUploadRules.MatchesSignature("image/webp", TestImages.Png()));
    }

    [Fact]
    public void MatchesSignature_Should_Refuse_A_Script_Dressed_As_An_Image()
    {
        var html = Encoding.UTF8.GetBytes("<script>alert(document.domain)</script>" + new string(' ', 64));

        Assert.False(ImageUploadRules.MatchesSignature("image/png", html));
        Assert.False(ImageUploadRules.MatchesSignature("image/jpeg", html));
        Assert.False(ImageUploadRules.MatchesSignature("image/webp", html));
    }

    [Fact]
    public void MatchesSignature_Should_Refuse_A_Truncated_Header()
    {
        Assert.False(ImageUploadRules.MatchesSignature("image/png", [0x89, 0x50]));
        Assert.False(ImageUploadRules.MatchesSignature("image/webp", Encoding.ASCII.GetBytes("RIFF")));
    }

    [Fact]
    public void MatchesSignature_Should_Refuse_A_Riff_That_Is_Not_Webp()
    {
        // A WAV file is also a RIFF container, so the form type has to be checked as well.
        var wav = new byte[16];
        Encoding.ASCII.GetBytes("RIFF").CopyTo(wav, 0);
        Encoding.ASCII.GetBytes("WAVE").CopyTo(wav, 8);

        Assert.False(ImageUploadRules.MatchesSignature("image/webp", wav));
    }
}
