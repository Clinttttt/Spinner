export type TransactionKind =
  "manualIncome" | "manualDeduction" | "bookingSale" | "manualOrderSale";

export type TransactionFilter =
  "all" | "income" | "deduction" | "today" | "thisWeek";

export type TransactionSort = "latest" | "oldest" | "highest" | "lowest";

export interface TransactionHistoryItem {
  amount: number;
  id: string;
  kind: TransactionKind;
  note?: string;
  occurredAt: string;
  orderCode?: string;
  serviceLabel?: string;
  sourceId?: string;
  title: string;
}

export interface CreateTransactionInput {
  amount: number;
  kind: "manualDeduction" | "manualIncome";
  note?: string;
  occurredAt: string;
}

export type TransactionHistoryViewState =
  "loading" | "ready" | "empty" | "error";
