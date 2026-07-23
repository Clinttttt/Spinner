using Spinner.Api.Features.ServicesPricing.CreateService;
using Spinner.Api.Features.ServicesPricing.DisableService;
using Spinner.Api.Features.ServicesPricing.GetServices;
using Spinner.Api.Features.ServicesPricing.SetServiceAvailability;
using Spinner.Api.Features.ServicesPricing.UpdatePricing;
using Spinner.Api.Features.ServicesPricing.UpdateService;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.ServicesPricing;

public sealed class ServicesPricingHandlerTests
{
    [Fact]
    public async Task CreateService_Should_Create_Active_Service()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var handler = new CreateServiceHandler(dbContext);

        var result = await handler.Handle(CreateCommand("Wash, Dry & Fold"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value!.IsActive);
        Assert.Equal(170m, result.Value.BasePrice);
        Assert.Single(dbContext.LaundryServices);
    }

    [Fact]
    public async Task CreateService_Should_Fail_When_Name_Already_Exists()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var handler = new CreateServiceHandler(dbContext);
        await handler.Handle(CreateCommand("Wash, Dry & Fold"), CancellationToken.None);

        var result = await handler.Handle(CreateCommand("wash, dry & fold"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task GetServices_Should_Return_Only_Active_Services_By_Default()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var createHandler = new CreateServiceHandler(dbContext);
        var active = await createHandler.Handle(CreateCommand("Wash, Dry & Fold"), CancellationToken.None);
        var disabled = await createHandler.Handle(CreateCommand("Hand Wash"), CancellationToken.None);
        await new DisableServiceHandler(dbContext).Handle(new DisableServiceCommand(disabled.Value!.Id), CancellationToken.None);

        var result = await new GetServicesHandler(dbContext).Handle(new GetServicesQuery(ActiveOnly: true), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value!);
        Assert.Equal(active.Value!.Id, result.Value![0].Id);
    }

    [Fact]
    public async Task UpdatePricing_Should_Update_Service_Price()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await new CreateServiceHandler(dbContext)
            .Handle(CreateCommand("Drop-off Laundry"), CancellationToken.None);

        var result = await new UpdatePricingHandler(dbContext).Handle(
            new UpdatePricingCommand(created.Value!.Id, "load", 150m, null),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(150m, result.Value!.BasePrice);
        Assert.Null(result.Value.DeliveryFee);
    }

    [Fact]
    public async Task UpdateService_Should_Fail_When_Service_Is_Disabled()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await new CreateServiceHandler(dbContext)
            .Handle(CreateCommand("Self-Service"), CancellationToken.None);
        await new DisableServiceHandler(dbContext)
            .Handle(new DisableServiceCommand(created.Value!.Id), CancellationToken.None);

        var result = await new UpdateServiceHandler(dbContext).Handle(
            new UpdateServiceCommand(created.Value.Id, "Self-Service Wash", null, false),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public async Task SetAvailability_Should_Persist_Requested_State()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var created = await new CreateServiceHandler(dbContext)
            .Handle(CreateCommand("Hand Wash"), CancellationToken.None);
        var handler = new SetServiceAvailabilityHandler(dbContext);

        var disabled = await handler.Handle(
            new SetServiceAvailabilityCommand(created.Value!.Id, false),
            CancellationToken.None);
        var enabled = await handler.Handle(
            new SetServiceAvailabilityCommand(created.Value.Id, true),
            CancellationToken.None);

        Assert.True(disabled.IsSuccess);
        Assert.False(disabled.Value!.IsActive);
        Assert.True(enabled.IsSuccess);
        Assert.True(enabled.Value!.IsActive);
    }

    private static CreateServiceCommand CreateCommand(string name) => new(
        name,
        "Laundry service",
        "load",
        170m,
        SupportsPickupAndDelivery: true,
        DeliveryFee: 30m);
}
