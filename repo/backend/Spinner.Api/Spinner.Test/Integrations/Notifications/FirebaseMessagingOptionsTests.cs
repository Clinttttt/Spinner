using System.Text;
using Spinner.Api.Integrations.Notifications;

namespace Spinner.Test.Integrations.Notifications;

/// <summary>
/// The service account key is pretty-printed JSON full of quotes and newlines, which
/// does not survive being passed through deployment tooling — the first attempt at
/// setting it arrived truncated to a single character. Accepting base64 removes that
/// class of problem instead of relying on quoting being right everywhere.
/// </summary>
public sealed class FirebaseMessagingOptionsTests
{
    private const string Json =
        "{\"type\":\"service_account\",\"project_id\":\"spinner-b1f97\"," +
        "\"private_key\":\"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n\"}";

    [Fact]
    public void Should_Accept_Plain_Json()
    {
        var options = new FirebaseMessagingOptions { ServiceAccountJson = Json };

        Assert.Equal(Json, options.ResolveServiceAccountJson());
    }

    [Fact]
    public void Should_Accept_Base64_Json()
    {
        var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(Json));
        var options = new FirebaseMessagingOptions { ServiceAccountJson = encoded };

        Assert.Equal(Json, options.ResolveServiceAccountJson());
    }

    [Fact]
    public void Should_Ignore_Surrounding_Whitespace()
    {
        var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(Json));
        var options = new FirebaseMessagingOptions
        {
            ServiceAccountJson = $"  {encoded}\n",
        };

        Assert.Equal(Json, options.ResolveServiceAccountJson());
    }

    [Fact]
    public void Should_Preserve_The_Escaped_Newlines_In_The_Private_Key()
    {
        var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(Json));
        var options = new FirebaseMessagingOptions { ServiceAccountJson = encoded };

        // The key's line breaks are escaped inside the JSON string. Losing them makes the
        // key unparseable, which is the failure this whole encoding exists to avoid.
        Assert.Contains("\\n", options.ResolveServiceAccountJson());
    }

    [Fact]
    public void Should_Report_Not_Configured_When_Empty()
    {
        Assert.False(new FirebaseMessagingOptions().IsConfigured);
        Assert.Equal(string.Empty, new FirebaseMessagingOptions().ResolveServiceAccountJson());
    }

    [Fact]
    public void Should_Need_Both_A_Key_And_A_Project()
    {
        Assert.False(
            new FirebaseMessagingOptions { ServiceAccountJson = Json }.IsConfigured);

        Assert.False(
            new FirebaseMessagingOptions { ProjectId = "spinner-b1f97" }.IsConfigured);

        Assert.True(
            new FirebaseMessagingOptions
            {
                ProjectId = "spinner-b1f97",
                ServiceAccountJson = Json,
            }.IsConfigured);
    }
}
