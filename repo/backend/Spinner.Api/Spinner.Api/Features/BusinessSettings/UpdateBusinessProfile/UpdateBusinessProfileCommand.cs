using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.BusinessSettings.UpdateBusinessProfile;

public sealed record UpdateBusinessProfileCommand(
    string BusinessName,
    string? LogoUrl,
    string PhoneNumber,
    string Address) : IRequest<Result<BusinessSettingsResponse>>;
