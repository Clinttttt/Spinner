using Microsoft.EntityFrameworkCore;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Bookings;
using Spinner.Api.Features.Bookings.GetBookingConfirmation;
using Spinner.Test.TestHelpers;

namespace Spinner.Test.Features.Bookings;

/// <summary>
/// The confirmation hands the customer an order reference and a tracking code, so
/// the lookup has to accept whichever one they read back. It previously matched the
/// order code only, exactly, and case sensitively, so tracking an order with the
/// tracking code — the obvious thing to do — reported that no order existed.
/// </summary>
public sealed class TrackOrderLookupTests
{
    [Fact]
    public async Task Should_Find_An_Order_By_Its_Order_Code()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var order = await CreateAsync(dbContext);

        var result = await Lookup(dbContext, order.OrderCode);

        Assert.True(result.IsSuccess);
        Assert.Equal(order.OrderCode, result.Value!.OrderCode);
    }

    [Fact]
    public async Task Should_Find_An_Order_By_Its_Tracking_Code()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var order = await CreateAsync(dbContext);

        var result = await Lookup(dbContext, order.TrackingCode);

        // The field on the confirmation is literally labelled "Tracking code".
        Assert.True(result.IsSuccess);
        Assert.Equal(order.OrderCode, result.Value!.OrderCode);
    }

    [Fact]
    public async Task Should_Ignore_Case()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var order = await CreateAsync(dbContext);

        Assert.True((await Lookup(dbContext, order.OrderCode.ToLowerInvariant())).IsSuccess);
        Assert.True((await Lookup(dbContext, order.TrackingCode.ToLowerInvariant())).IsSuccess);
    }

    [Fact]
    public async Task Should_Ignore_Spacing_Around_A_Pasted_Code()
    {
        await using var dbContext = AppDbContextFactory.Create();
        var order = await CreateAsync(dbContext);

        // Copying from a message very often brings whitespace with it.
        var result = await Lookup(dbContext, $"  {order.OrderCode}\n");

        Assert.True(result.IsSuccess);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("ES-DOES-NOT-EXIST")]
    public async Task Should_Report_Not_Found_For_A_Code_That_Is_Not_Ours(string code)
    {
        await using var dbContext = AppDbContextFactory.Create();
        await CreateAsync(dbContext);

        var result = await Lookup(dbContext, code);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.NotFound, result.Status);
    }

    [Fact]
    public async Task Should_Not_Leak_Anything_For_An_Absurdly_Long_Code()
    {
        await using var dbContext = AppDbContextFactory.Create();
        await CreateAsync(dbContext);

        var result = await Lookup(dbContext, new string('A', 500));

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.NotFound, result.Status);
    }

    private static async Task<Spinner.Api.Domain.Orders.LaundryOrder> CreateAsync(
        Spinner.Api.Database.AppDbContext dbContext)
    {
        await BookingTestData.CreateBookingAsync(dbContext);
        return await dbContext.LaundryOrders.AsNoTracking().FirstAsync();
    }

    private static Task<Result<BookingConfirmationResponse>> Lookup(
        Spinner.Api.Database.AppDbContext dbContext,
        string code) =>
        new GetBookingConfirmationHandler(dbContext)
            .Handle(new GetBookingConfirmationQuery(code), CancellationToken.None);
}
