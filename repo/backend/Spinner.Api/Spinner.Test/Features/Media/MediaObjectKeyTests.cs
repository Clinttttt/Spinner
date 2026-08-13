using Spinner.Api.Features.Media;

namespace Spinner.Test.Features.Media;

public sealed class MediaObjectKeyTests
{
    [Fact]
    public void Create_Should_File_Each_Purpose_In_Its_Own_Folder()
    {
        Assert.StartsWith("logos/", MediaObjectKey.Create(MediaPurpose.Logo, "image/png"));
        Assert.StartsWith("profile-photos/", MediaObjectKey.Create(MediaPurpose.ProfilePhoto, "image/jpeg"));
    }

    [Fact]
    public void Create_Should_Use_The_Extension_For_The_Content_Type()
    {
        Assert.EndsWith(".png", MediaObjectKey.Create(MediaPurpose.Logo, "image/png"));
        Assert.EndsWith(".jpg", MediaObjectKey.Create(MediaPurpose.Logo, "image/jpeg"));
        Assert.EndsWith(".webp", MediaObjectKey.Create(MediaPurpose.Logo, "image/webp"));
    }

    [Fact]
    public void Create_Should_Never_Repeat_A_Key()
    {
        // Replacing the logo has to produce a new address, or a cached copy of the old image
        // would be served in its place — including by mail clients, which cache aggressively.
        var keys = Enumerable.Range(0, 500)
            .Select(_ => MediaObjectKey.Create(MediaPurpose.Logo, "image/png"))
            .ToArray();

        Assert.Equal(keys.Length, keys.Distinct(StringComparer.Ordinal).Count());
    }

    [Fact]
    public void Create_Should_Produce_A_Readable_Key()
    {
        foreach (var purpose in new[] { MediaPurpose.Logo, MediaPurpose.ProfilePhoto })
        {
            var key = MediaObjectKey.Create(purpose, "image/png");

            Assert.True(MediaObjectKey.IsReadable(key), $"{key} should be readable back.");
        }
    }

    [Theory]
    [InlineData("logos/abc.png")]
    [InlineData("profile-photos/abc-1_2.webp")]
    public void IsReadable_Should_Allow_Plain_Keys_In_Known_Folders(string key)
    {
        Assert.True(MediaObjectKey.IsReadable(key));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("abc.png")]                        // no folder at all
    [InlineData("/logos/abc.png")]                 // leading separator
    [InlineData("logos/")]                         // no file
    [InlineData("logos//abc.png")]                 // empty segment
    [InlineData("logos/../secrets/abc.png")]       // traversal
    [InlineData("logos/..")]                       // traversal
    [InlineData("secrets/abc.png")]                // a folder this API does not use
    [InlineData("logos/nested/abc.png")]           // deeper than the layout allows
    [InlineData("logos/abc png.png")]              // space
    [InlineData("logos/abc?x=1")]                  // query-like characters
    [InlineData("logos/abc%2fdef.png")]            // encoded separator
    public void IsReadable_Should_Refuse_Anything_Unexpected(string? key)
    {
        Assert.False(MediaObjectKey.IsReadable(key));
    }

    [Fact]
    public void IsReadable_Should_Refuse_An_Overlong_Key()
    {
        Assert.False(MediaObjectKey.IsReadable("logos/" + new string('a', 300) + ".png"));
    }

    [Fact]
    public void FolderFor_Should_Refuse_A_Purpose_It_Does_Not_Know()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => MediaObjectKey.FolderFor((MediaPurpose)999));
    }
}
