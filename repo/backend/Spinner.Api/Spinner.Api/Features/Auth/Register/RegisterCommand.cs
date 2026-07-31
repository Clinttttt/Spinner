using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Features.Auth.Login;

namespace Spinner.Api.Features.Auth.Register;

public sealed record RegisterCommand(
    string FullName,
    string EmailAddress,
    string MobileNumber,
    string Password,
    string ConfirmPassword) : IRequest<Result<RegisterResponse>>;
