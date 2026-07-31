import { apiRequest, type ApiRequestOptions } from "./apiClient";

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export function withPage(path: string, page: number, pageSize: number) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}page=${page}&pageSize=${pageSize}`;
}

export async function getAllPages<T>(
  path: string,
  options?: ApiRequestOptions,
  pageSize = 100,
) {
  const items: T[] = [];
  let page = 1;

  do {
    const response = await apiRequest<PagedResponse<T>>(
      withPage(path, page, pageSize),
      options,
    );
    items.push(...response.items);
    if (!response.hasNextPage) break;
    page += 1;
  } while (page <= 100);

  return items;
}
