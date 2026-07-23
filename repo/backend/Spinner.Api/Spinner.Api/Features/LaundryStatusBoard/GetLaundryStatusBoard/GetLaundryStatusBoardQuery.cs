using MediatR;
using Spinner.Api.Common.Results;

namespace Spinner.Api.Features.LaundryStatusBoard.GetLaundryStatusBoard;

public sealed record GetLaundryStatusBoardQuery : IRequest<Result<LaundryStatusBoardResponse>>;
