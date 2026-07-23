using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Operations.GetNewBookingRequests;

public sealed record GetNewBookingRequestsQuery : IRequest<Result<IReadOnlyList<NewBookingRequestResponse>>>;
