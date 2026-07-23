using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Auth.ChangePassword;

public sealed record ChangePasswordCommand(
    Guid UserId,
    string CurrentPassword,
    string NewPassword)
    : IRequest<Result>;
