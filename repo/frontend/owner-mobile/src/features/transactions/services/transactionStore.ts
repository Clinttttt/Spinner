import { useSyncExternalStore } from "react";

import { apiRequest } from "../../../api/apiClient";
import { getAllPages } from "../../../api/pagination";
import type {
  CreateTransactionInput,
  TransactionHistoryItem,
  TransactionKind,
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

let transactions: TransactionHistoryItem[] = [];
let refreshPromise: Promise<TransactionHistoryItem[]> | null = null;
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

export function subscribeToTransactions(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTransactionsSnapshot() {
  return transactions;
}

export function useTransactions() {
  return useSyncExternalStore(
    subscribeToTransactions,
    getTransactionsSnapshot,
    getTransactionsSnapshot,
  );
}

export async function refreshTransactions() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = getAllPages<TransactionDto>("/api/transactions?sort=Latest")
    .then((response) => response.map(mapTransaction))
    .then((next) => {
      transactions = next;
      emitChange();
      return next;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
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
  transactions = [
    transaction,
    ...transactions.filter((item) => item.id !== transaction.id),
  ];
  emitChange();
  return transaction;
}
