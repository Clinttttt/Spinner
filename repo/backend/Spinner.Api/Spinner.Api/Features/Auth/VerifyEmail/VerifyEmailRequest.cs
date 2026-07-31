namespace Spinner.Api.Features.Auth.VerifyEmail;

public sealed record VerifyEmailRequest(string EmailAddress, string Code);
