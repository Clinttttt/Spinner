import { apiRequest } from "../../../api/apiClient";
import { type PagedResponse, withPage } from "../../../api/pagination";

/** How the message was sent. */
export type NotificationChannel = "sms" | "email" | "push";

/**
 * Who a message went to.
 *
 * Push notifications go to the shop's own phones, and their recipient is a Firebase
 * registration token — a long opaque string that tells the owner nothing. Everything
 * else goes to a customer, where the phone number or email address is exactly what they
 * want to see.
 */
export type NotificationAudience = "customer" | "staff";

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
  audience: NotificationAudience;
  channel: NotificationChannel;
  createdAt: string;
  lastError?: string;
  message: string;
  notificationId: string;
  orderCode?: string;
  /** Written for the owner to read, not the raw address the provider was given. */
  recipientLabel: string;
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

function channel(value: string): NotificationChannel {
  if (value === "Sms") return "sms";
  if (value === "Push") return "push";
  return "email";
}

/**
 * What to show as the recipient.
 *
 * A push goes to a Firebase registration token, which is an opaque string of a hundred
 * or so characters. Printing it was worse than printing nothing: it filled the row,
 * looked like a fault, and told the owner nothing about who was notified. The shop's own
 * phones are described as such instead.
 */
function recipientLabel(dto: NotificationHistoryDto) {
  if (dto.channel !== "Push") return dto.recipient;

  return "This shop's phones";
}

function mapEntry(dto: NotificationHistoryDto): NotificationEntry {
  return {
    attemptCount: dto.attemptCount,
    audience: dto.channel === "Push" ? "staff" : "customer",
    channel: channel(dto.channel),
    createdAt: dto.createdAt,
    lastError: dto.lastError ?? undefined,
    message: dto.message,
    notificationId: dto.notificationId,
    orderCode: dto.orderCode ?? undefined,
    recipientLabel: recipientLabel(dto),
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
