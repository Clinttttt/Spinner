using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Auth.GetCurrentAccount;

public sealed record GetCurrentAccountQuery(Guid UserId)
    : IRequest<Result<AccountProfileResponse>>;
