using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Features.Customers.GetCustomerDetails;
using Spinner.Api.Features.Customers.GetCustomerList;

namespace Spinner.Api.Controllers;

[Route("api/customers")]
[Authorize]
public sealed class CustomersController : ApiControllerBase
{
    public CustomersController(ISender sender)
        : base(sender)
    {
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<CustomerListItemResponse>>> GetCustomers(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageRequest.DefaultPageSize,
        CancellationToken ct = default)
    {
        var result = await Sender.Send(new GetCustomerListQuery(search, page, pageSize), ct);
        return HandleResponse(result);
    }

    [HttpGet("{customerId:guid}")]
    public async Task<ActionResult<CustomerDetailsResponse>> GetCustomerDetails(
        Guid customerId,
        CancellationToken ct)
    {
        var result = await Sender.Send(new GetCustomerDetailsQuery(customerId), ct);
        return HandleResponse(result);
    }
}
