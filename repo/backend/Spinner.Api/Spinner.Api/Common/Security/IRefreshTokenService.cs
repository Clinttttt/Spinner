namespace Spinner.Api.Common.Security;

public interface IRefreshTokenService
{
    GeneratedRefreshToken Generate();

    string Hash(string token);
}

public sealed record GeneratedRefreshToken(
    string Token,
    string TokenHash);
