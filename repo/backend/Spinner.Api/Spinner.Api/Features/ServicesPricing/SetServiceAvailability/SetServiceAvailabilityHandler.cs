using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.ServicesPricing.SetServiceAvailability;

public sealed class SetServiceAvailabilityHandler
    : IRequestHandler<SetServiceAvailabilityCommand, Result<ServiceResponse>>
{
    private readonly AppDbContext _dbContext;

    public SetServiceAvailabilityHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<ServiceResponse>> Handle(
        SetServiceAvailabilityCommand request,
        CancellationToken cancellationToken)
    {
        var service = await _dbContext.LaundryServices
            .FirstOrDefaultAsync(
                service => service.Id == request.ServiceId,
                cancellationToken);

        if (service is null)
            return Result<ServiceResponse>.NotFound("Service was not found.");

        service.SetAvailability(request.IsActive, DateTimeOffset.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<ServiceResponse>.Success(ServiceResponse.FromEntity(service));
    }
}
