using MediatR;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Users;

namespace Spinner.Api.Features.Staff.InviteStaff;

public sealed record InviteStaffCommand(
    Guid InvitedByUserId,
    string EmailAddress,
    StaffRole Role) : IRequest<Result<InviteStaffResponse>>;
