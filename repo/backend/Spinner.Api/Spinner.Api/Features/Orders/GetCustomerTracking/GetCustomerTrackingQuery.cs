using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Orders.GetCustomerTracking;

public sealed record GetCustomerTrackingQuery(string TrackingCode) : IRequest<Result<CustomerTrackingResponse>>;
