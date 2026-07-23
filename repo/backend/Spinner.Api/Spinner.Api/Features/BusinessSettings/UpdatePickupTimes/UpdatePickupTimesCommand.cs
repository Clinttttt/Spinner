using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.BusinessSettings.UpdatePickupTimes;

public sealed record UpdatePickupTimesCommand(string PickupTimeWindows)
    : IRequest<Result<BusinessSettingsResponse>>;
