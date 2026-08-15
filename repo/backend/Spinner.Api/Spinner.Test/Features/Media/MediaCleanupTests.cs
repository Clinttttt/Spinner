using Microsoft.Extensions.Logging.Abstractions;
using Spinner.Api.Features.Media;

namespace Spinner.Test.Features.Media;

/// <summary>
/// Housekeeping for an image that has been replaced.
/// </summary>
/// <remarks>
/// Every upload gets a fresh key so a cached copy can never go stale, which means the previous
/// object stays behind unless something removes it. The danger is deleting the wrong thing: the
/// owner may point the logo at an image hosted anywhere, and that must never become a delete.
/// </remarks>
public sealed class MediaCleanupTests
{
    private const string Ours = "https://api.spinlaundry.online/api/media/logos/abc123.png";
    private const string OursReplacement = "https://api.spinlaundry.online/api/media/logos/def456.png";

    [Fact]
    public async Task Should_Remove_The_Superseded_Image()
    {
        var storage = new FakeMediaStorage();

        await MediaCleanup.RemoveSupersededAsync(storage, Logger, Ours, OursReplacement, default);

        Assert.Equal(["logos/abc123.png"], storage.DeletedKeys);
    }

    [Fact]
    public async Task Should_Leave_An_Image_Hosted_Somewhere_Else_Alone()
    {
        // The owner can paste a link to any public image. Deleting is not ours to do.
        var storage = new FakeMediaStorage();

        await MediaCleanup.RemoveSupersededAsync(
            storage,
            Logger,
            "https://someone-elses-site.example/brand/logo.png",
            OursReplacement,
            default);

        Assert.Empty(storage.DeletedKeys);
    }

    [Fact]
    public async Task Should_Do_Nothing_When_The_Image_Did_Not_Change()
    {
        var storage = new FakeMediaStorage();

        await MediaCleanup.RemoveSupersededAsync(storage, Logger, Ours, Ours, default);

        Assert.Empty(storage.DeletedKeys);
    }

    [Fact]
    public async Task Should_Remove_The_Old_Image_When_The_Logo_Is_Cleared()
    {
        // Clearing the logo supersedes it just as much as replacing it does.
        var storage = new FakeMediaStorage();

        await MediaCleanup.RemoveSupersededAsync(storage, Logger, Ours, null, default);

        Assert.Equal(["logos/abc123.png"], storage.DeletedKeys);
    }

    [Fact]
    public async Task Should_Do_Nothing_When_Storage_Is_Not_Configured()
    {
        var storage = new FakeMediaStorage(isConfigured: false);

        await MediaCleanup.RemoveSupersededAsync(storage, Logger, Ours, OursReplacement, default);

        Assert.Empty(storage.DeletedKeys);
    }

    [Theory]
    [InlineData("https://api.spinlaundry.online/api/media/secrets/keys.png")]
    [InlineData("https://api.spinlaundry.online/api/media/logos/../../etc/passwd")]
    [InlineData("https://api.spinlaundry.online/api/media/")]
    [InlineData("not even a url")]
    [InlineData("")]
    [InlineData(null)]
    public async Task Should_Refuse_Anything_That_Is_Not_One_Of_Our_Keys(string? previousUrl)
    {
        var storage = new FakeMediaStorage();

        await MediaCleanup.RemoveSupersededAsync(storage, Logger, previousUrl, OursReplacement, default);

        Assert.Empty(storage.DeletedKeys);
    }

    [Fact]
    public void ReadKeyFromUrl_Should_Ignore_A_Query_String()
    {
        Assert.Equal(
            "logos/abc123.png",
            MediaObjectKey.ReadKeyFromUrl($"{Ours}?v=2"));
    }

    private static NullLogger<MediaCleanupTests> Logger => NullLogger<MediaCleanupTests>.Instance;
}
