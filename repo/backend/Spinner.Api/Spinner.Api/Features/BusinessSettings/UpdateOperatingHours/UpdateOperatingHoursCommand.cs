using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.BusinessSettings.UpdateOperatingHours;

public sealed record UpdateOperatingHoursCommand(string OperatingHours)
    : IRequest<Result<BusinessSettingsResponse>>;
