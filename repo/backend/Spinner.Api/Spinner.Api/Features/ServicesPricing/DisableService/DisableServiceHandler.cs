using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.ServicesPricing.DisableService;

public sealed class DisableServiceHandler : IRequestHandler<DisableServiceCommand, Result<ServiceResponse>>
{
    private readonly AppDbContext _dbContext;

    public DisableServiceHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<ServiceResponse>> Handle(
        DisableServiceCommand request,
        CancellationToken cancellationToken)
    {
        var service = await _dbContext.LaundryServices
            .FirstOrDefaultAsync(service => service.Id == request.ServiceId, cancellationToken);

        if (service is null)
            return Result<ServiceResponse>.NotFound("Service was not found.");

        var result = service.Disable(DateTimeOffset.UtcNow);

        if (!result.IsSuccess)
            return Result<ServiceResponse>.Conflict(result.Error.Message);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<ServiceResponse>.Success(ServiceResponse.FromEntity(service));
    }
}
