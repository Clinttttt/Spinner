using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.ServicesPricing.GetServices;

public sealed class GetServicesHandler : IRequestHandler<GetServicesQuery, Result<IReadOnlyList<ServiceResponse>>>
{
    private readonly AppDbContext _dbContext;

    public GetServicesHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<IReadOnlyList<ServiceResponse>>> Handle(
        GetServicesQuery request,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.LaundryServices.AsNoTracking();

        if (request.ActiveOnly)
            query = query.Where(service => service.IsActive);

        var services = await query
            .OrderBy(service => service.Name)
            .Select(service => ServiceResponse.FromEntity(service))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<ServiceResponse>>.Success(services);
    }
}
