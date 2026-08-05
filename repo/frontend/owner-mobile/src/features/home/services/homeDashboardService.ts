import { apiRequest } from "../../../api/apiClient";
import { type PagedResponse, withPage } from "../../../api/pagination";
import { refreshOperationsCounts } from "../../operations/operationsCountsStore";
import type { HomeActivity, HomeDashboardData } from "../models/homeDashboard";

interface BookingDto {
  customerName: string;
  fulfillmentType: string;
  orderCode: string;
  orderId: string;
  preferredTimeWindow: string;
  status: string;
}

interface TransactionDto {
  amount: number;
  id: string;
  kind: string;
  occurredAt: string;
  orderCode?: string;
  title: string;
}

/**
 * How many rows to look through for something to show.
 *
 * Only the first match of each kind is ever used, so this read one page instead of
 * every page. Fetching the shop's whole booking and transaction history to fill two
 * rows was work that grew every month for no gain.
 */
const SCAN_PAGE_SIZE = 50;

function currency(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function getHomeDashboard(): Promise<HomeDashboardData> {
  const [dashboard, bookings, transactions] = await Promise.all([
    // Through the shared store, so the tab bar and this screen do not each ask the
    // server for the same counts.
    refreshOperationsCounts(),
    apiRequest<PagedResponse<BookingDto>>(
      withPage("/api/bookings", 1, SCAN_PAGE_SIZE),
    ).then((response) => response.items),
    apiRequest<PagedResponse<TransactionDto>>(
      withPage("/api/transactions?sort=Latest", 1, SCAN_PAGE_SIZE),
    ).then((response) => response.items),
  ]);

  const activities: HomeActivity[] = [];
  const pickup = bookings.find(
    (item) =>
      item.fulfillmentType === "PickupAndDelivery" &&
      item.status !== "Completed" &&
      item.status !== "Rejected",
  );
  if (pickup) {
    activities.push({
      badge: "Pickup",
      id: pickup.orderId,
      // Carried so tapping the row can open that order rather than the work list.
      orderCode: pickup.orderCode,
      subtitle: `Pickup at ${pickup.preferredTimeWindow}`,
      title: pickup.customerName,
      type: "pickup",
    });
  }

  const sale = transactions.find(
    (item) => item.kind === "BookingSale" || item.kind === "ManualOrderSale",
  );
  if (sale) {
    activities.push({
      id: sale.id,
      meta: timeLabel(sale.occurredAt),
      orderCode: sale.orderCode,
      subtitle: `Total ${currency(sale.amount)}`,
      title: sale.title,
      type: "receipt",
    });
  }

  return {
    ownerName: "Owner",
    pendingBookingCount: dashboard.newBookings,
    recentActivities: activities,
  };
}
