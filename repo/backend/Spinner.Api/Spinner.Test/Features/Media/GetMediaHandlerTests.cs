using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Media.GetMedia;
using Spinner.Api.Integrations.Media;

namespace Spinner.Test.Features.Media;

public sealed class GetMediaHandlerTests
{
    [Fact]
    public async Task Handle_Should_Return_The_Stored_Image()
    {
        var storage = new FakeMediaStorage();
        storage.Seed("logos/abc.png", "image/png");
        var handler = CreateHandler(storage, cacheMaxAgeSeconds: 604_800);

        var result = await handler.Handle(new GetMediaQuery("logos/abc.png"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("image/png", result.Value!.ContentType);
        Assert.Equal(604_800, result.Value.CacheMaxAgeSeconds);
        await using var content = result.Value.Content;
        Assert.True(content.Length > 0);
    }

    [Fact]
    public async Task Handle_Should_Answer_Not_Found_For_A_Key_That_Is_Not_There()
    {
        var handler = CreateHandler(new FakeMediaStorage());

        var result = await handler.Handle(new GetMediaQuery("logos/missing.png"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.NotFound, result.Status);
    }

    [Theory]
    [InlineData("../appsettings.json")]
    [InlineData("logos/../../etc/passwd")]
    [InlineData("secrets/keys.png")]
    [InlineData("")]
    public async Task Handle_Should_Refuse_An_Unsafe_Key_Without_Asking_Storage(string key)
    {
        var storage = new FakeMediaStorage();
        var handler = CreateHandler(storage);

        var result = await handler.Handle(new GetMediaQuery(key), CancellationToken.None);

        Assert.Equal(ResultStatus.NotFound, result.Status);
        // The point of the check is that the request stops here, so a malformed key costs
        // nothing and reveals nothing.
        Assert.Empty(storage.OpenedKeys);
    }

    [Fact]
    public async Task Handle_Should_Answer_Not_Found_When_Storage_Is_Not_Configured()
    {
        var storage = new FakeMediaStorage(isConfigured: false);
        var handler = CreateHandler(storage);

        var result = await handler.Handle(new GetMediaQuery("logos/abc.png"), CancellationToken.None);

        Assert.Equal(ResultStatus.NotFound, result.Status);
        Assert.Empty(storage.OpenedKeys);
    }

    [Fact]
    public async Task Handle_Should_Pass_The_Storage_ETag_Through()
    {
        var storage = new FakeMediaStorage();
        storage.Seed("logos/abc.png", "image/png");
        var handler = CreateHandler(storage);

        var result = await handler.Handle(new GetMediaQuery("logos/abc.png"), CancellationToken.None);

        Assert.Equal("\"fake-etag\"", result.Value!.ETag);
        await using var content = result.Value.Content;
    }

    private static GetMediaHandler CreateHandler(
        FakeMediaStorage storage,
        int cacheMaxAgeSeconds = 31_536_000) =>
        new(storage, Options.Create(new MediaStorageOptions
        {
            CacheMaxAgeSeconds = cacheMaxAgeSeconds
        }));
}
