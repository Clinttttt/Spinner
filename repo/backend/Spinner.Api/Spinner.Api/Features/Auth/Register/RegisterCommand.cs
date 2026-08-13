using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Auth.Login;

namespace Spinner.Api.Features.Auth.Register;

/// <param name="InvitationCode">
/// Null only for the very first account, which has nobody to invite it. Once an account
/// exists this is required, and the handler refuses registration without it.
///
/// Deliberately has no default value. It used to default to null, which let the controller
/// build this command without passing it at all — and the compiler said nothing, because the
/// call was still valid. Every invited staff member was then told "An invitation code is
/// required" while holding a perfectly good code, since the one they typed never left the
/// controller. Making the argument explicit means the same mistake stops the build.
/// </param>
public sealed record RegisterCommand(
    string FullName,
    string EmailAddress,
    string MobileNumber,
    string Password,
    string ConfirmPassword,
    string? InvitationCode) : IRequest<Result<RegisterResponse>>;
