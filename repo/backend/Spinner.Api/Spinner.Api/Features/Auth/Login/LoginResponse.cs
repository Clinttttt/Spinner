using Spinner.Api.Domain.Users;

namespace Spinner.Api.Features.Auth.Login;

public sealed record LoginResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt,
    Guid UserId,
    string FullName,
    string EmailAddress,
    StaffRole Role);
