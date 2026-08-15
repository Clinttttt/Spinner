using Spinner.Test.Features.Media;
using Microsoft.Extensions.Logging.Abstractions;
using Spinner.Api.Features.BusinessSettings.GetBusinessSettings;
using Spinner.Api.Features.BusinessSettings.UpdateBusinessProfile;
using Spinner.Api.Features.BusinessSettings.UpdatePaymentMethods;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.BusinessSettings;

public sealed class BusinessSettingsHandlerTests
{
    [Fact]
    public async Task GetBusinessSettings_Should_Create_Default_Settings_When_Missing()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var handler = new GetBusinessSettingsHandler(dbContext);

        var result = await handler.Handle(new GetBusinessSettingsQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        // A row has to exist before anything can read a radius or a payment method, but what
        // it contains must not be a real laundromat's details. Asserting the absence of one
        // shop's name is what stops it being written back in.
        Assert.False(string.IsNullOrWhiteSpace(result.Value!.BusinessName));
        Assert.DoesNotContain("Engr", result.Value.BusinessName, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(string.Empty, result.Value.PhoneNumber);
        Assert.Equal(string.Empty, result.Value.Address);
        Assert.True(result.Value.IsCashOnDeliveryEnabled);
        Assert.Single(dbContext.BusinessSettings);
    }

    [Fact]
    public async Task UpdateBusinessProfile_Should_Update_Default_Settings()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var handler = new UpdateBusinessProfileHandler(dbContext, new FakeMediaStorage(), NullLogger<UpdateBusinessProfileHandler>.Instance);

        var result = await handler.Handle(
            new UpdateBusinessProfileCommand(
                "Spinner Laundry",
                null,
                "09171234567",
                "Butuan City"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Spinner Laundry", result.Value!.BusinessName);
        Assert.Equal("09171234567", result.Value.PhoneNumber);
        Assert.Single(dbContext.BusinessSettings);
    }

    [Fact]
    public async Task UpdatePaymentMethods_Should_Fail_When_All_Methods_Are_Disabled()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var handler = new UpdatePaymentMethodsHandler(dbContext);

        var result = await handler.Handle(new UpdatePaymentMethodsCommand(false, false), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(Spinner.Api.Common.Results.ResultStatus.Validation, result.Status);
    }
}
