using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Auth.Login;

namespace Spinner.Api.Features.Auth.Register;

/// <remarks>
/// <see cref="InvitationCode"/> is optional only because the very first account
/// has nobody to invite it. Once an account exists it is required.
/// </remarks>
public sealed record RegisterCommand(
    string FullName,
    string EmailAddress,
    string MobileNumber,
    string Password,
    string ConfirmPassword,
    string? InvitationCode = null) : IRequest<Result<RegisterResponse>>;
