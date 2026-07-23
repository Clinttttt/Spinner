namespace Spinner.Api.Features.LaundryStatusBoard;

public sealed record LaundryStatusBoardResponse(
    IReadOnlyList<LaundryStatusBoardItemResponse> Received,
    IReadOnlyList<LaundryStatusBoardItemResponse> BeingProcessed,
    IReadOnlyList<LaundryStatusBoardItemResponse> Ready);
