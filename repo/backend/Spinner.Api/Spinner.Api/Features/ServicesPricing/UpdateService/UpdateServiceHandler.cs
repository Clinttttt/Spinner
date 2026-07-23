using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.ServicesPricing.UpdateService;

public sealed class UpdateServiceHandler : IRequestHandler<UpdateServiceCommand, Result<ServiceResponse>>
{
    private readonly AppDbContext _dbContext;

    public UpdateServiceHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<ServiceResponse>> Handle(
        UpdateServiceCommand request,
        CancellationToken cancellationToken)
    {
        var service = await _dbContext.LaundryServices
            .FirstOrDefaultAsync(service => service.Id == request.ServiceId, cancellationToken);

        if (service is null)
            return Result<ServiceResponse>.NotFound("Service was not found.");

        var normalizedName = request.Name.Trim().ToLowerInvariant();
        var nameExists = await _dbContext.LaundryServices.AnyAsync(
            existing => existing.Id != request.ServiceId && existing.Name.ToLower() == normalizedName,
            cancellationToken);

        if (nameExists)
            return Result<ServiceResponse>.Conflict("A service with the same name already exists.");

        var updateResult = service.UpdateDetails(
            request.Name,
            request.Description,
            request.SupportsPickupAndDelivery,
            DateTimeOffset.UtcNow);

        if (!updateResult.IsSuccess)
            return Result<ServiceResponse>.Conflict(updateResult.Error.Message);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<ServiceResponse>.Success(ServiceResponse.FromEntity(service));
    }
}
