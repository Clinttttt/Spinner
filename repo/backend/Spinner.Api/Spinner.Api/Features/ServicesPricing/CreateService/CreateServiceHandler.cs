using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;
using Spinner.Api.Domain.Services;

namespace Spinner.Api.Features.ServicesPricing.CreateService;

public sealed class CreateServiceHandler : IRequestHandler<CreateServiceCommand, Result<ServiceResponse>>
{
    private readonly AppDbContext _dbContext;

    public CreateServiceHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<ServiceResponse>> Handle(
        CreateServiceCommand request,
        CancellationToken cancellationToken)
    {
        var normalizedName = request.Name.Trim().ToLowerInvariant();
        var nameExists = await _dbContext.LaundryServices
            .AnyAsync(service => service.Name.ToLower() == normalizedName, cancellationToken);

        if (nameExists)
            return Result<ServiceResponse>.Conflict("A service with the same name already exists.");

        var service = new LaundryService(
            request.Name,
            request.Description,
            request.UnitLabel,
            request.BasePrice,
            request.SupportsPickupAndDelivery,
            request.DeliveryFee,
            DateTimeOffset.UtcNow);

        _dbContext.LaundryServices.Add(service);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<ServiceResponse>.Success(ServiceResponse.FromEntity(service));
    }
}
