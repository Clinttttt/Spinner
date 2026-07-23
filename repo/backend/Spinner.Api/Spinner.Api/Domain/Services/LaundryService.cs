using Spinner.Api.Common.Results;

namespace Spinner.Api.Domain.Services;

public sealed class LaundryService
{
    private LaundryService()
    {
    }

    public LaundryService(
        string name,
        string? description,
        string unitLabel,
        decimal basePrice,
        bool supportsPickupAndDelivery,
        decimal? deliveryFee,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        UnitLabel = unitLabel.Trim();
        BasePrice = basePrice;
        SupportsPickupAndDelivery = supportsPickupAndDelivery;
        DeliveryFee = deliveryFee;
        IsActive = true;
        CreatedAt = now;
        UpdatedAt = now;
    }

    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string UnitLabel { get; private set; } = string.Empty;
    public decimal BasePrice { get; private set; }
    public bool SupportsPickupAndDelivery { get; private set; }
    public decimal? DeliveryFee { get; private set; }
    public bool IsActive { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public Result UpdateDetails(
        string name,
        string? description,
        bool supportsPickupAndDelivery,
        DateTimeOffset now)
    {
        if (!IsActive)
            return Result.Conflict("Disabled services cannot be updated.");

        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        SupportsPickupAndDelivery = supportsPickupAndDelivery;
        UpdatedAt = now;

        return Result.Success();
    }

    public Result UpdatePricing(
        string unitLabel,
        decimal basePrice,
        decimal? deliveryFee,
        DateTimeOffset now)
    {
        if (!IsActive)
            return Result.Conflict("Disabled services cannot be repriced.");

        UnitLabel = unitLabel.Trim();
        BasePrice = basePrice;
        DeliveryFee = deliveryFee;
        UpdatedAt = now;

        return Result.Success();
    }

    public Result Disable(DateTimeOffset now)
    {
        if (!IsActive)
            return Result.Conflict("Service is already disabled.");

        IsActive = false;
        UpdatedAt = now;

        return Result.Success();
    }

    public Result SetAvailability(bool isActive, DateTimeOffset now)
    {
        if (IsActive == isActive)
            return Result.Success();

        IsActive = isActive;
        UpdatedAt = now;

        return Result.Success();
    }
}
