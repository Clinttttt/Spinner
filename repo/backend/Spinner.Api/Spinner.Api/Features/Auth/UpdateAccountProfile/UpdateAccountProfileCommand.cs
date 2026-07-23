using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Auth.UpdateAccountProfile;

public sealed record UpdateAccountProfileCommand(
    Guid UserId,
    string FullName,
    string EmailAddress,
    string? MobileNumber)
    : IRequest<Result<AccountProfileResponse>>;
