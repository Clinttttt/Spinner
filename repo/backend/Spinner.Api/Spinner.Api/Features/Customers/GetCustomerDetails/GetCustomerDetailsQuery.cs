using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Customers.GetCustomerDetails;

public sealed record GetCustomerDetailsQuery(Guid CustomerId)
    : IRequest<Result<CustomerDetailsResponse>>;
