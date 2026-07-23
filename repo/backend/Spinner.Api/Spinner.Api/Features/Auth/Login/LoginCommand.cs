using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.Auth.Login;

public sealed record LoginCommand(string Login, string Password) : IRequest<Result<LoginResponse>>;
