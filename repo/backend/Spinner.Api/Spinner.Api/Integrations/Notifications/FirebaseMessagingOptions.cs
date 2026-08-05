namespace Spinner.Api.Integrations.Notifications;

public sealed class FirebaseMessagingOptions
{
    public const string SectionName = "FirebaseMessaging";

    /// <summary>
    /// The service account key JSON, as issued by Firebase.
    /// </summary>
    /// <remarks>
    /// Held as a secret in the deployment rather than a file in the repository: it
    /// authorises sending to every device the project knows about. Empty means push is
    /// simply off, which is the correct state before credentials are configured — a
    /// booking must still succeed.
    /// </remarks>
    public string ServiceAccountJson { get; set; } = string.Empty;

    /// <summary>The Firebase project the messages are sent through.</summary>
    public string ProjectId { get; set; } = string.Empty;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ServiceAccountJson) &&
        !string.IsNullOrWhiteSpace(ProjectId);
}
