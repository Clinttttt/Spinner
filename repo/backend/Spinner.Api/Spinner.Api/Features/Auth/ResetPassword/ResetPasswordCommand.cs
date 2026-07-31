using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Auth.ResetPassword;

public sealed record ResetPasswordCommand(
    string Login,
    string Code,
    string NewPassword,
    string ConfirmPassword) : IRequest<Result>;
