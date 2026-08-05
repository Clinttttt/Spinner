import { apiRequest } from "../../../api/apiClient";
import { type PagedResponse, withPage } from "../../../api/pagination";

/** How the message was sent to the customer. */
export type NotificationChannel = "sms" | "email";

/**
 * Where a message got to.
 *
 * "sending" covers a message a worker has claimed and is putting through now. It is
 * shown as in progress rather than as a problem, because it usually resolves within a
 * few seconds.
 */
export type NotificationState = "sent" | "sending" | "waiting" | "failed";

export interface NotificationEntry {
  attemptCount: number;
  channel: NotificationChannel;
  createdAt: string;
  lastError?: string;
  message: string;
  notificationId: string;
  orderCode?: string;
  recipient: string;
  sentAt?: string;
  state: NotificationState;
  subject?: string;
}

interface NotificationHistoryDto {
  notificationId: string;
  orderId?: string;
  orderCode?: string;
  channel: string;
  recipient: string;
  subject?: string;
  message: string;
  status: string;
  attemptCount: number;
  lastError?: string;
  createdAt: string;
  sentAt?: string;
}

const PAGE_SIZE = 25;

function state(status: string): NotificationState {
  if (status === "Sent") return "sent";
  if (status === "Processing") return "sending";
  if (status === "Failed") return "failed";
  return "waiting";
}

function mapEntry(dto: NotificationHistoryDto): NotificationEntry {
  return {
    attemptCount: dto.attemptCount,
    channel: dto.channel === "Sms" ? "sms" : "email",
    createdAt: dto.createdAt,
    lastError: dto.lastError ?? undefined,
    message: dto.message,
    notificationId: dto.notificationId,
    orderCode: dto.orderCode ?? undefined,
    recipient: dto.recipient,
    sentAt: dto.sentAt ?? undefined,
    state: state(dto.status),
    subject: dto.subject ?? undefined,
  };
}

export async function getNotificationHistoryPage(page: number) {
  const response = await apiRequest<PagedResponse<NotificationHistoryDto>>(
    withPage("/api/notifications/history", page, PAGE_SIZE),
  );

  return {
    entries: response.items.map(mapEntry),
    hasNextPage: response.hasNextPage,
    totalCount: response.totalCount,
  };
}
