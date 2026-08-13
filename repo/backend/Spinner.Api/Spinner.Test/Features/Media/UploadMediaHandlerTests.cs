using System.Text;
using Microsoft.Extensions.Options;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Media;
using Spinner.Api.Features.Media.UploadMedia;
using Spinner.Api.Integrations.Media;

namespace Spinner.Test.Features.Media;

public sealed class UploadMediaHandlerTests
{
    [Fact]
    public async Task Handle_Should_Store_The_Image_And_Return_Its_Public_Url()
    {
        var storage = new FakeMediaStorage();
        var handler = CreateHandler(storage, publicBaseUrl: "https://api.spinlaundry.online");

        var result = await handler.Handle(
            new UploadMediaCommand(MediaPurpose.Logo, TestImages.Png(), "image/png", null),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Single(storage.SavedKeys);
        Assert.Equal(storage.SavedKeys[0], result.Value!.Key);
        Assert.Equal("image/png", result.Value.ContentType);
        Assert.Equal(
            $"https://api.spinlaundry.online/api/media/{result.Value.Key}",
            result.Value.Url);
    }

    [Fact]
    public async Task Handle_Should_Not_Double_The_Separator_When_The_Base_Url_Has_A_Trailing_Slash()
    {
        var handler = CreateHandler(new FakeMediaStorage(), publicBaseUrl: "https://api.spinlaundry.online/");

        var result = await handler.Handle(
            new UploadMediaCommand(MediaPurpose.Logo, TestImages.Png(), "image/png", null),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.DoesNotContain("online//api", result.Value!.Url);
        Assert.StartsWith("https://api.spinlaundry.online/api/media/", result.Value.Url);
    }

    [Fact]
    public async Task Handle_Should_Fall_Back_To_The_Callers_Origin_When_None_Is_Configured()
    {
        // The local development case: no public address is configured, so the URL is built
        // from where the request arrived.
        var handler = CreateHandler(new FakeMediaStorage(), publicBaseUrl: string.Empty);

        var result = await handler.Handle(
            new UploadMediaCommand(MediaPurpose.Logo, TestImages.Png(), "image/png", "http://localhost:5235"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.StartsWith("http://localhost:5235/api/media/logos/", result.Value!.Url);
    }

    [Fact]
    public async Task Handle_Should_Prefer_The_Configured_Address_Over_The_Request()
    {
        // Behind the container platform's ingress the request arrives as plain HTTP on an
        // internal host, so trusting it would put an unreachable URL in the shop's emails.
        var handler = CreateHandler(new FakeMediaStorage(), publicBaseUrl: "https://api.spinlaundry.online");

        var result = await handler.Handle(
            new UploadMediaCommand(MediaPurpose.Logo, TestImages.Png(), "image/png", "http://10.0.0.4:8080"),
            CancellationToken.None);

        Assert.StartsWith("https://api.spinlaundry.online/", result.Value!.Url);
    }

    [Fact]
    public async Task Handle_Should_File_A_Profile_Photo_Separately_From_A_Logo()
    {
        var storage = new FakeMediaStorage();
        var handler = CreateHandler(storage);

        await handler.Handle(
            new UploadMediaCommand(MediaPurpose.ProfilePhoto, TestImages.Jpeg(), "image/jpeg", null),
            CancellationToken.None);

        Assert.StartsWith("profile-photos/", storage.SavedKeys[0]);
    }

    [Fact]
    public async Task Handle_Should_Refuse_A_File_That_Is_Not_The_Type_It_Claims()
    {
        var storage = new FakeMediaStorage();
        var handler = CreateHandler(storage);
        var notAnImage = Encoding.UTF8.GetBytes("<script>alert(1)</script>" + new string(' ', 128));

        var result = await handler.Handle(
            new UploadMediaCommand(MediaPurpose.Logo, notAnImage, "image/png", null),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Validation, result.Status);
        // Nothing may reach storage: this endpoint's output is served from the shop's own
        // domain, so storing it at all would be the problem.
        Assert.Empty(storage.SavedKeys);
    }

    [Fact]
    public async Task Handle_Should_Explain_Itself_When_Storage_Is_Not_Configured()
    {
        var handler = CreateHandler(new FakeMediaStorage(isConfigured: false));

        var result = await handler.Handle(
            new UploadMediaCommand(MediaPurpose.Logo, TestImages.Png(), "image/png", null),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        // The owner should be pointed at the alternative that does work, not shown a fault.
        Assert.Contains("link", result.Error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Handle_Should_Ignore_A_Content_Type_Parameter()
    {
        var handler = CreateHandler(new FakeMediaStorage());

        var result = await handler.Handle(
            new UploadMediaCommand(MediaPurpose.Logo, TestImages.Png(), "image/png; charset=binary", null),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("image/png", result.Value!.ContentType);
        Assert.EndsWith(".png", result.Value.Key);
    }

    private static UploadMediaHandler CreateHandler(
        FakeMediaStorage storage,
        string publicBaseUrl = "https://api.spinlaundry.online") =>
        new(storage, Options.Create(new MediaStorageOptions { PublicBaseUrl = publicBaseUrl }));
}
