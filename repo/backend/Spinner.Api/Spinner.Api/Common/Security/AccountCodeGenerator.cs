using System.Security.Cryptography;

namespace Spinner.Api.Common.Security;

public sealed class AccountCodeGenerator : IAccountCodeGenerator
{
    public string Generate() =>
        RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
}
