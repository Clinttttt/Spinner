using Spinner.Api.Integrations.OnlinePayments;

namespace Spinner.Test.Integrations;

/// <summary>
/// The provider works in centavos as whole numbers, so this conversion decides what
/// the customer is actually charged. A rounding slip here is a real overcharge or
/// undercharge, and it would then fail the amount check that settles the order.
/// </summary>
public sealed class PayMongoAmountConversionTests
{
    [Theory]
    [InlineData(0, 0)]
    [InlineData(1, 100)]
    [InlineData(60, 6000)]
    [InlineData(170, 17000)]
    [InlineData(230.5, 23050)]
    [InlineData(1234.56, 123456)]
    public void Should_Convert_Pesos_To_Centavos(decimal pesos, int expected)
    {
        Assert.Equal(expected, PayMongoCheckoutGateway.ToCentavos(pesos));
    }

    [Theory]
    // Half a centavo rounds away from zero rather than to the nearest even value,
    // so a price ending .005 is never quietly rounded down in the shop's favour.
    [InlineData(0.005, 1)]
    [InlineData(0.015, 2)]
    [InlineData(10.125, 1013)]
    public void Should_Round_Half_Away_From_Zero(decimal pesos, int expected)
    {
        Assert.Equal(expected, PayMongoCheckoutGateway.ToCentavos(pesos));
    }

    [Fact]
    public void Should_Not_Lose_Precision_On_A_Realistic_Multi_Service_Total()
    {
        // 2 x 170 + 1 x 90 + 60 delivery.
        Assert.Equal(49_000, PayMongoCheckoutGateway.ToCentavos(490m));
    }
}
