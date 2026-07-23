namespace Spinner.Api.Features.BusinessSettings.UpdateBusinessProfile;

public sealed record UpdateBusinessProfileRequest(
    string BusinessName,
    string? LogoUrl,
    string PhoneNumber,
    string Address);
