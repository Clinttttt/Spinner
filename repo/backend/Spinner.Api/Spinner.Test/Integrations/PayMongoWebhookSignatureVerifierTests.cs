using Microsoft.Extensions.Options;
using Spinner.Api.Integrations.OnlinePayments;

namespace Spinner.Test.Integrations;

/// <summary>
/// This check is the only thing separating an HTTP request from an order being
/// treated as paid, so every way of getting it wrong has to be a rejection.
/// </summary>
public sealed class PayMongoWebhookSignatureVerifierTests
{
    private const string Secret = "whsk_test_secret_value_for_unit_tests";
    private const string Body = """{"data":{"attributes":{"type":"checkout_session.payment.paid"}}}""";

    private static readonly DateTimeOffset Now = DateTimeOffset.FromUnixTimeSeconds(1_800_000_000);

    [Fact]
    public void Should_Accept_A_Signature_Produced_The_Way_PayMongo_Produces_It()
    {
        var verifier = Verifier(testMode: true);
        var header = PayMongoWebhookSignatureVerifier.BuildHeader(
            Body, Secret, Now.ToUnixTimeSeconds(), testMode: true);

        Assert.True(verifier.Verify(Body, header, Now));
    }

    [Fact]
    public void Should_Reject_A_Body_That_Changed_After_Signing()
    {
        var verifier = Verifier(testMode: true);
        var header = PayMongoWebhookSignatureVerifier.BuildHeader(
            Body, Secret, Now.ToUnixTimeSeconds(), testMode: true);

        // A single extra space is enough: the signature covers the exact bytes.
        Assert.False(verifier.Verify(Body + " ", header, Now));
    }

    [Fact]
    public void Should_Reject_A_Signature_Made_With_Another_Secret()
    {
        var verifier = Verifier(testMode: true);
        var header = PayMongoWebhookSignatureVerifier.BuildHeader(
            Body, "whsk_someone_elses_secret", Now.ToUnixTimeSeconds(), testMode: true);

        Assert.False(verifier.Verify(Body, header, Now));
    }

    [Theory]
    [InlineData(11)]
    [InlineData(-11)]
    public void Should_Reject_A_Signature_Outside_The_Time_Tolerance(int minutesOff)
    {
        var verifier = Verifier(testMode: true);
        var signedAt = Now.AddMinutes(-minutesOff);
        var header = PayMongoWebhookSignatureVerifier.BuildHeader(
            Body, Secret, signedAt.ToUnixTimeSeconds(), testMode: true);

        // Stops a captured request being replayed later.
        Assert.False(verifier.Verify(Body, header, Now));
    }

    [Fact]
    public void Should_Accept_A_Signature_Within_The_Time_Tolerance()
    {
        var verifier = Verifier(testMode: true);
        var header = PayMongoWebhookSignatureVerifier.BuildHeader(
            Body, Secret, Now.AddMinutes(-4).ToUnixTimeSeconds(), testMode: true);

        // Provider retries arrive minutes later and must still be honoured.
        Assert.True(verifier.Verify(Body, header, Now));
    }

    [Fact]
    public void Should_Not_Accept_A_Live_Signature_While_In_Test_Mode()
    {
        var verifier = Verifier(testMode: true);
        var header = PayMongoWebhookSignatureVerifier.BuildHeader(
            Body, Secret, Now.ToUnixTimeSeconds(), testMode: false);

        // PayMongo signs test and live traffic separately; crossing them would let
        // live events settle test bookings and the reverse.
        Assert.False(verifier.Verify(Body, header, Now));
    }

    [Fact]
    public void Should_Not_Accept_A_Test_Signature_While_In_Live_Mode()
    {
        var verifier = Verifier(testMode: false);
        var header = PayMongoWebhookSignatureVerifier.BuildHeader(
            Body, Secret, Now.ToUnixTimeSeconds(), testMode: true);

        Assert.False(verifier.Verify(Body, header, Now));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("garbage")]
    [InlineData("te=abc")]
    [InlineData("t=notanumber,te=abc")]
    public void Should_Reject_A_Header_It_Cannot_Trust(string? header)
    {
        Assert.False(Verifier(testMode: true).Verify(Body, header, Now));
    }

    [Fact]
    public void Should_Reject_Everything_When_No_Secret_Is_Configured()
    {
        var verifier = new PayMongoWebhookSignatureVerifier(
            Options.Create(new OnlinePaymentOptions { PayMongoSecretKey = "sk_test_x" }));

        var header = PayMongoWebhookSignatureVerifier.BuildHeader(
            Body, Secret, Now.ToUnixTimeSeconds(), testMode: true);

        // A deployment with no secret must not accept payment events at all.
        Assert.False(verifier.Verify(Body, header, Now));
    }

    private static PayMongoWebhookSignatureVerifier Verifier(bool testMode) =>
        new(Options.Create(new OnlinePaymentOptions
        {
            PayMongoSecretKey = testMode ? "sk_test_key" : "sk_live_key",
            PayMongoWebhookSecret = Secret,
        }));
}
