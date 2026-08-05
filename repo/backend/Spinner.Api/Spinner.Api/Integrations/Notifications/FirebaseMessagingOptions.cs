namespace Spinner.Api.Integrations.Notifications;

public sealed class FirebaseMessagingOptions
{
    public const string SectionName = "FirebaseMessaging";

    /// <summary>
    /// The service account key, either as JSON or base64-encoded JSON.
    /// </summary>
    /// <remarks>
    /// Held as a secret in the deployment rather than a file in the repository: it
    /// authorises sending to every device the project knows about. Empty means push is
    /// simply off, which is the correct state before credentials are configured — a
    /// booking must still succeed.
    ///
    /// Base64 is accepted because the raw key is pretty-printed JSON containing quotes
    /// and newlines, which does not survive being passed through deployment tooling
    /// intact. It arrived truncated to a single character the first time. Encoding it
    /// removes that entire class of problem rather than relying on quoting being right.
    /// </remarks>
    public string ServiceAccountJson { get; set; } = string.Empty;

    /// <summary>The Firebase project the messages are sent through.</summary>
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>
    /// The key as JSON, whichever form it was supplied in.
    /// </summary>
    public string ResolveServiceAccountJson()
    {
        var value = ServiceAccountJson?.Trim() ?? string.Empty;

        if (value.Length == 0) return string.Empty;

        // Already JSON.
        if (value.StartsWith('{')) return value;

        try
        {
            return System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(value));
        }
        catch (FormatException)
        {
            // Neither JSON nor valid base64. Returned as-is so the failure surfaces when
            // the credential is built, with a message naming the service account, rather
            // than being silently swallowed here.
            return value;
        }
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ServiceAccountJson) &&
        !string.IsNullOrWhiteSpace(ProjectId);
}
