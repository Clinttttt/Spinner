namespace Spinner.Api.Features.Auth.Register;

public sealed record RegisterResponse(
    string EmailAddress,
    bool VerificationRequired,
    int CodeExpiresInMinutes);
