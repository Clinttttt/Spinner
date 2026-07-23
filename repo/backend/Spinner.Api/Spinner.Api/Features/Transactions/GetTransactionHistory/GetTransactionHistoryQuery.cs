using MediatR;
using Spinner.Api.Common.Pagination;
using Spinner.Api.Common.Results;
using Spinner.Api.Domain.Transactions;

namespace Spinner.Api.Features.Transactions.GetTransactionHistory;

public sealed record GetTransactionHistoryQuery(
    string? Search,
    TransactionKind? Kind,
    DateOnly? From,
    DateOnly? To,
    TransactionSort Sort = TransactionSort.Latest,
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize)
    : IRequest<Result<PagedResponse<TransactionHistoryResponse>>>;
