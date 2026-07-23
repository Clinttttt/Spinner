using Spinner.Api.Domain.Users;

namespace Spinner.Api.Common.Security;

public interface IJwtTokenService
{
    AccessTokenResult CreateToken(StaffUser user);
}

public sealed record AccessTokenResult(
    string Token,
    DateTimeOffset ExpiresAt);
