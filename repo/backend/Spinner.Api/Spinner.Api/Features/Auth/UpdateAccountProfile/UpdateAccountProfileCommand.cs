using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Auth.UpdateAccountProfile;

/// <param name="PhotoUrl">
/// The person's profile picture. Null or empty clears it, which puts their initials back —
/// a supported choice rather than a missing value.
/// </param>
public sealed record UpdateAccountProfileCommand(
    Guid UserId,
    string FullName,
    string EmailAddress,
    string? MobileNumber,
    string? PhotoUrl)
    : IRequest<Result<AccountProfileResponse>>;
