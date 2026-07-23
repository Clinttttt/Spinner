using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Deliveries.GetDeliverySchedule;

public sealed record GetDeliveryScheduleQuery(DateOnly Date)
    : IRequest<Result<IReadOnlyList<DeliveryScheduleItemResponse>>>;
