using MediatR;
using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Database;

namespace Spinner.Api.Features.ServicesPricing.UpdatePricing;

public sealed class UpdatePricingHandler : IRequestHandler<UpdatePricingCommand, Result<ServiceResponse>>
{
    private readonly AppDbContext _dbContext;

    public UpdatePricingHandler(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<ServiceResponse>> Handle(
        UpdatePricingCommand request,
        CancellationToken cancellationToken)
    {
        var service = await _dbContext.LaundryServices
            .FirstOrDefaultAsync(service => service.Id == request.ServiceId, cancellationToken);

        if (service is null)
            return Result<ServiceResponse>.NotFound("Service was not found.");

        var updateResult = service.UpdatePricing(
            request.UnitLabel,
            request.BasePrice,
            request.DeliveryFee,
            DateTimeOffset.UtcNow);

        if (!updateResult.IsSuccess)
            return Result<ServiceResponse>.Conflict(updateResult.Error.Message);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<ServiceResponse>.Success(ServiceResponse.FromEntity(service));
    }
}
