using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Options;

namespace Spinner.Api.Integrations.Notifications;

/// <summary>
/// Supplies the bearer token Firebase Cloud Messaging expects.
/// </summary>
/// <remarks>
/// Behind an interface so the sender can be tested without a service account. Signing a
/// Google OAuth assertion is not something worth reimplementing, and it is not something
/// a test should need to do.
/// </remarks>
public interface IFirebaseAccessTokenProvider
{
    Task<string> GetAccessTokenAsync(CancellationToken cancellationToken);
}

public sealed class FirebaseAccessTokenProvider : IFirebaseAccessTokenProvider
{
    /// <summary>The only scope Firebase Cloud Messaging needs.</summary>
    private const string MessagingScope = "https://www.googleapis.com/auth/firebase.messaging";

    private readonly FirebaseMessagingOptions _options;
    private ITokenAccess? _credential;

    public FirebaseAccessTokenProvider(IOptions<FirebaseMessagingOptions> options)
    {
        _options = options.Value;
    }

    public Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        if (!_options.IsConfigured)
            throw new InvalidOperationException("Firebase messaging is not configured.");

        // Built once and reused. The credential caches the token itself and renews it
        // before expiry, so asking it on every send costs nothing after the first.
        _credential ??= GoogleCredential
            .FromJson(_options.ResolveServiceAccountJson())
            .CreateScoped(MessagingScope)
            .UnderlyingCredential;

        return _credential.GetAccessTokenForRequestAsync(cancellationToken: cancellationToken);
    }
}
