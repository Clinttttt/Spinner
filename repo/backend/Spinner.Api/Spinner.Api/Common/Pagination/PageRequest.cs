namespace Spinner.Api.Common.Pagination;

public static class PageRequest
{
    public const int DefaultPageSize = 20;
    public const int MaximumPageSize = 100;

    public static int NormalizePage(int page) => Math.Max(1, page);

    public static int NormalizePageSize(int pageSize) =>
        Math.Clamp(pageSize, 1, MaximumPageSize);
}
