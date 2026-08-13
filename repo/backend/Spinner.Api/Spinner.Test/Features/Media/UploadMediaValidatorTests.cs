using Microsoft.Extensions.Options;
using Spinner.Api.Features.Media;
using Spinner.Api.Features.Media.UploadMedia;
using Spinner.Api.Integrations.Media;

namespace Spinner.Test.Features.Media;

public sealed class UploadMediaValidatorTests
{
    [Fact]
    public void Should_Accept_A_Reasonable_Image()
    {
        var result = Validate(new UploadMediaCommand(
            MediaPurpose.Logo,
            TestImages.Png(),
            "image/png",
            null));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Should_Refuse_An_Image_Over_The_Configured_Limit()
    {
        var maximumBytes = 1024 * 1024;

        var result = Validate(
            new UploadMediaCommand(MediaPurpose.Logo, new byte[maximumBytes + 1], "image/png", null),
            maximumBytes);

        Assert.False(result.IsValid);
        // The message has to name a size the owner can act on, in the unit they think in.
        Assert.Contains("1 MB or smaller", result.Errors.Single().ErrorMessage);
    }

    [Fact]
    public void Should_Accept_An_Image_Exactly_On_The_Limit()
    {
        var maximumBytes = 1024 * 1024;

        var result = Validate(
            new UploadMediaCommand(MediaPurpose.Logo, new byte[maximumBytes], "image/png", null),
            maximumBytes);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Should_Refuse_A_File_Too_Small_To_Be_An_Image()
    {
        var result = Validate(new UploadMediaCommand(
            MediaPurpose.Logo,
            [0x89, 0x50, 0x4E, 0x47],
            "image/png",
            null));

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("image/svg+xml")]
    [InlineData("image/gif")]
    [InlineData("text/html")]
    [InlineData("")]
    public void Should_Refuse_An_Unsupported_Content_Type(string contentType)
    {
        var result = Validate(new UploadMediaCommand(
            MediaPurpose.Logo,
            TestImages.Png(),
            contentType,
            null));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Should_Refuse_A_Purpose_That_Does_Not_Exist()
    {
        var result = Validate(new UploadMediaCommand(
            (MediaPurpose)99,
            TestImages.Png(),
            "image/png",
            null));

        Assert.False(result.IsValid);
    }

    private static FluentValidation.Results.ValidationResult Validate(
        UploadMediaCommand command,
        int maxUploadBytes = 5 * 1024 * 1024)
    {
        var validator = new UploadMediaValidator(
            Options.Create(new MediaStorageOptions { MaxUploadBytes = maxUploadBytes }));

        return validator.Validate(command);
    }
}
