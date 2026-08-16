using Spinner.Api.Integrations.OnlinePayments;

namespace Spinner.Test.Integrations.OnlinePayments;

/// <summary>
/// What the shop looks like on the customer's screen and statement.
/// </summary>
/// <remarks>
/// Both of these were previously absent from the checkout we send. Without a statement
/// descriptor PayMongo labels the charge with the account's own business name, which is the
/// wrong shop entirely where one account serves two businesses. Without a line item image it
/// draws a large grey tile containing the first letter of the line, which is what made the
/// checkout page look unfinished.
/// </remarks>
public sealed class PayMongoCheckoutPresentationTests
{
    [Fact]
    public void Statement_Descriptor_Should_Pass_A_Normal_Shop_Name_Through()
    {
        Assert.Equal(
            "Engr. Spin Laundry",
            PayMongoCheckoutGateway.StatementDescriptor("Engr. Spin Laundry"));
    }

    [Fact]
    public void Statement_Descriptor_Should_Trim_Surrounding_Space()
    {
        Assert.Equal("Sunrise Laundry", PayMongoCheckoutGateway.StatementDescriptor("  Sunrise Laundry  "));
    }

    [Fact]
    public void Statement_Descriptor_Should_Shorten_An_Overlong_Name_Rather_Than_Fail()
    {
        // A rejected checkout would stop the customer paying at all, which is far worse than a
        // clipped name on a statement.
        var descriptor = PayMongoCheckoutGateway.StatementDescriptor(
            "The Extremely Long Laundromat And Dry Cleaning Company Of Surigao");

        Assert.NotNull(descriptor);
        Assert.True(descriptor!.Length <= 30, $"was {descriptor.Length} characters");
        Assert.StartsWith("The Extremely Long", descriptor);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Statement_Descriptor_Should_Be_Omitted_When_There_Is_No_Name(string? value)
    {
        // Null means the field is left out, rather than sent empty.
        Assert.Null(PayMongoCheckoutGateway.StatementDescriptor(value));
    }

    [Fact]
    public void Line_Item_Images_Should_Offer_An_Https_Address()
    {
        var images = PayMongoCheckoutGateway.LineItemImages(
            "https://api.spinlaundry.online/api/media/logos/abc.png");

        Assert.NotNull(images);
        Assert.Single(images!);
        Assert.Equal("https://api.spinlaundry.online/api/media/logos/abc.png", images[0]);
    }

    [Theory]
    [InlineData("http://api.spinlaundry.online/api/media/logos/abc.png")]
    [InlineData("/assets/logo.jpg")]
    [InlineData("http://10.0.0.4:5235/api/media/logos/abc.png")]
    [InlineData("not a url")]
    [InlineData("")]
    [InlineData(null)]
    public void Line_Item_Images_Should_Refuse_Anything_PayMongo_Could_Not_Fetch(string? imageUrl)
    {
        // PayMongo's own servers fetch this. A relative path or a local address would render as
        // a broken image on the customer's screen, which is worse than the placeholder.
        Assert.Null(PayMongoCheckoutGateway.LineItemImages(imageUrl));
    }
}
