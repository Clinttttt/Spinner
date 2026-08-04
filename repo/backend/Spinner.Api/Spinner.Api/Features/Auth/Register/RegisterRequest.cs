namespace Spinner.Api.Features.Auth.Register;

public sealed record RegisterRequest(
    string FullName,
    string EmailAddress,
    string MobileNumber,
    string Password,
    string ConfirmPassword,
    string? InvitationCode = null);
