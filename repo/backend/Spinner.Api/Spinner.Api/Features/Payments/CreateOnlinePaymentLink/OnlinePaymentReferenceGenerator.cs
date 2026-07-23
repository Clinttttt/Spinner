namespace Spinner.Api.Features.Payments.CreateOnlinePaymentLink;

public static class OnlinePaymentReferenceGenerator
{
    public static string NewReference(DateTimeOffset now) =>
        $"PAY-{now:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..36].ToUpperInvariant();
}
