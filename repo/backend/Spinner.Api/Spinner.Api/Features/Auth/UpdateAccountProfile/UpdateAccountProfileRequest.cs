namespace Spinner.Api.Features.Auth.UpdateAccountProfile;

public sealed record UpdateAccountProfileRequest(
    string FullName,
    string EmailAddress,
    string? MobileNumber);
