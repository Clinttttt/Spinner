using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.BusinessSettings.GetBusinessSettings;

public sealed record GetBusinessSettingsQuery : IRequest<Result<BusinessSettingsResponse>>;
