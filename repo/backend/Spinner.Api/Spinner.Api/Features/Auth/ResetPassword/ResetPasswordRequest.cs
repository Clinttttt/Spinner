namespace Spinner.Api.Features.Auth.ResetPassword;

public sealed record ResetPasswordRequest(
    string Login,
    string Code,
    string NewPassword,
    string ConfirmPassword);
