using System.Security.Cryptography;

namespace Spinner.Api.Features.Payments;

public static class ReceiptCodeGenerator
{
    public static string NewReceiptCode(DateTimeOffset now) =>
        $"DR-{now:yyyyMMddHHmmssfff}-{RandomNumberGenerator.GetInt32(100, 999)}";
}
