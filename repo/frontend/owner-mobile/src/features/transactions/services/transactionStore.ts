import { useSyncExternalStore } from "react";

import { apiRequest } from "../../../api/apiClient";
import { type PagedResponse, withPage } from "../../../api/pagination";
import type {
  CreateTransactionInput,
  TransactionFilter,
  TransactionHistoryItem,
  TransactionKind,
  TransactionSort,
} from "../models/transaction";

interface TransactionDto {
  amount: number;
  id: string;
  kind: string;
  note?: string;
  occurredAt: string;
  orderCode?: string;
  serviceLabel?: string;
  sourceId?: string;
  title: string;
}

export interface TransactionQuery {
  filter: TransactionFilter;
  search: string;
  sort: TransactionSort;
}

export interface TransactionsState {
  hasMore: boolean;
  items: TransactionHistoryItem[];
  loadingMore: boolean;
  totalCount: number;
}

/**
 * How many rows to fetch at a time.
 *
 * Enough to fill a tall screen and a little beyond, so scrolling does not stall on
 * a request, but nowhere near the whole history.
 */
const PAGE_SIZE = 30;

const EMPTY_STATE: TransactionsState = {
  hasMore: false,
  items: [],
  loadingMore: false,
  totalCount: 0,
};

let state: TransactionsState = EMPTY_STATE;
let loadedPage = 0;
let activeQuery: TransactionQuery = {
  filter: "all",
  search: "",
  sort: "latest",
};

/**
 * Identifies the request currently in flight.
 *
 * Search runs as the owner types, so replies can arrive out of order. Anything that
 * is not the newest request is discarded, otherwise an earlier, slower response
 * overwrites the results for what was actually typed.
 */
let requestToken = 0;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function mapKind(kind: string): TransactionKind {
  if (kind === "ManualDeduction") return "manualDeduction";
  if (kind === "BookingSale") return "bookingSale";
  if (kind === "ManualOrderSale") return "manualOrderSale";
  return "manualIncome";
}

function mapTransaction(dto: TransactionDto): TransactionHistoryItem {
  return {
    amount: dto.amount,
    id: dto.id,
    kind: mapKind(dto.kind),
    note: dto.note,
    occurredAt: dto.occurredAt,
    orderCode: dto.orderCode,
    serviceLabel: dto.serviceLabel,
    sourceId: dto.sourceId,
    title: dto.title,
  };
}

function apiSort(sort: TransactionSort): string {
  if (sort === "oldest") return "Oldest";
  if (sort === "highest") return "Highest";
  if (sort === "lowest") return "Lowest";
  return "Latest";
}

function asDateOnly(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfWeek(reference: Date) {
  const start = new Date(reference);
  // Monday, matching how the shop reads a week.
  const dayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOffset);
  return start;
}

/**
 * Turns the owner's chosen filter into query parameters.
 *
 * The quick filters mix two different ideas: Income and Deduction are a direction,
 * while Today and This Week are a date range. Both are now expressed to the server
 * rather than applied to a local copy of everything.
 */
function applyFilter(params: URLSearchParams, filter: TransactionFilter) {
  if (filter === "income") {
    params.set("direction", "In");
    return;
  }

  if (filter === "deduction") {
    params.set("direction", "Out");
    return;
  }

  if (filter === "today") {
    const today = asDateOnly(new Date());
    params.set("from", today);
    params.set("to", today);
    return;
  }

  if (filter === "thisWeek") {
    const now = new Date();
    params.set("from", asDateOnly(startOfWeek(now)));
    params.set("to", asDateOnly(now));
  }
}

function buildPath(query: TransactionQuery, page: number) {
  const params = new URLSearchParams();
  params.set("sort", apiSort(query.sort));
  applyFilter(params, query.filter);

  const search = query.search.trim();
  if (search) params.set("search", search);

  return withPage(`/api/transactions?${params.toString()}`, page, PAGE_SIZE);
}

export function subscribeToTransactions(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTransactionsSnapshot() {
  return state;
}

export function useTransactionsState() {
  return useSyncExternalStore(
    subscribeToTransactions,
    getTransactionsSnapshot,
    getTransactionsSnapshot,
  );
}

/** The rows currently loaded, for screens that only want a recent few. */
export function useTransactions() {
  return useTransactionsState().items;
}

/** Reloads the first page of whatever query is active. */
export function refreshTransactions() {
  return loadTransactions(activeQuery);
}

/**
 * Loads the first page for a query, replacing whatever is on screen.
 *
 * The search, filter and sort are all applied by the server. They used to be applied
 * here, over a copy of the shop's entire transaction history that had been downloaded
 * page by page on every refresh.
 */
export async function loadTransactions(query: TransactionQuery) {
  const token = ++requestToken;
  activeQuery = query;

  const response = await apiRequest<PagedResponse<TransactionDto>>(
    buildPath(query, 1),
  );

  if (token !== requestToken) return state;

  loadedPage = 1;
  state = {
    hasMore: response.hasNextPage,
    items: response.items.map(mapTransaction),
    loadingMore: false,
    totalCount: response.totalCount,
  };
  emitChange();

  return state;
}

/** Appends the next page, if there is one and nothing else is already fetching. */
export async function loadMoreTransactions() {
  if (!state.hasMore || state.loadingMore) return state;

  const token = requestToken;
  state = { ...state, loadingMore: true };
  emitChange();

  try {
    const response = await apiRequest<PagedResponse<TransactionDto>>(
      buildPath(activeQuery, loadedPage + 1),
    );

    // The query changed while this was in flight, so these rows belong to a list the
    // owner is no longer looking at.
    if (token !== requestToken) return state;

    loadedPage += 1;

    const existing = new Set(state.items.map((item) => item.id));

    state = {
      hasMore: response.hasNextPage,
      items: [
        ...state.items,
        // Guarded against duplicates because a row added between page requests
        // shifts everything down by one, which would otherwise repeat a row and
        // collide on its key.
        ...response.items
          .map(mapTransaction)
          .filter((item) => !existing.has(item.id)),
      ],
      loadingMore: false,
      totalCount: response.totalCount,
    };
    emitChange();
  } catch (error) {
    state = { ...state, loadingMore: false };
    emitChange();
    throw error;
  }

  return state;
}

export function resetTransactions() {
  requestToken += 1;
  loadedPage = 0;
  state = EMPTY_STATE;
  emitChange();
}

export async function saveTransaction(
  input: CreateTransactionInput,
): Promise<TransactionHistoryItem> {
  const response = await apiRequest<TransactionDto>("/api/transactions", {
    body: {
      amount: input.amount,
      kind: input.kind === "manualIncome" ? "ManualIncome" : "ManualDeduction",
      note: input.note?.trim() || null,
      occurredAt: input.occurredAt,
    },
    method: "POST",
  });

  const transaction = mapTransaction(response);

  state = {
    ...state,
    items: [
      transaction,
      ...state.items.filter((item) => item.id !== transaction.id),
    ],
    totalCount: state.totalCount + 1,
  };
  emitChange();

  return transaction;
}
