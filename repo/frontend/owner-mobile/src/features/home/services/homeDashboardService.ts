import { apiRequest } from "../../../api/apiClient";
import { getAllPages } from "../../../api/pagination";
import type { HomeActivity, HomeDashboardData } from "../models/homeDashboard";

interface OperationsDashboardDto {
  newBookings: number;
}

interface BookingDto {
  customerName: string;
  fulfillmentType: string;
  orderId: string;
  preferredTimeWindow: string;
  status: string;
}

interface TransactionDto {
  amount: number;
  id: string;
  kind: string;
  occurredAt: string;
  title: string;
}

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
    apiRequest<OperationsDashboardDto>("/api/operations/dashboard"),
    getAllPages<BookingDto>("/api/bookings", undefined, 20),
    getAllPages<TransactionDto>("/api/transactions?sort=Latest", undefined, 20),
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
