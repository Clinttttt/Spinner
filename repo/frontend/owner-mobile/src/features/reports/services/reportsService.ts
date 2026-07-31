import { getAllPages } from "../../../api/pagination";
import type {
  ReportFilters,
  ReportPeriodId,
  ReportsDashboardData,
  TopServiceReport,
} from "../models/reports";

interface OrderHistoryDto {
  fulfillmentType: string;
  paymentStatus: string;
  preferredDate: string;
  serviceName: string;
  status: string;
  totalAmount: number;
}

interface TransactionDto {
  amount: number;
  kind: "ManualIncome" | "ManualDeduction" | "BookingSale" | "ManualOrderSale";
  occurredAt: string;
}

interface DateRange {
  from: Date;
  to: Date;
}

const serviceStyles: Pick<TopServiceReport, "colorKey" | "icon">[] = [
  { colorKey: "primaryBlue", icon: "shirt-outline" },
  { colorKey: "lavender", icon: "car-outline" },
  { colorKey: "lavenderLight", icon: "shirt-outline" },
  { colorKey: "blueLight", icon: "water-outline" },
];

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function rangeFor(period: ReportPeriodId): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = addDays(
    today,
    -(today.getDay() === 0 ? 6 : today.getDay() - 1),
  );
  if (period === "previousWeek") {
    return { from: addDays(monday, -7), to: addDays(monday, -1) };
  }
  if (period === "monthToDate") {
    return {
      from: new Date(today.getFullYear(), today.getMonth(), 1),
      to: today,
    };
  }
  return { from: monday, to: addDays(monday, 6) };
}

function previousRange(range: DateRange): DateRange {
  const days =
    Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000) + 1;
  return { from: addDays(range.from, -days), to: addDays(range.from, -1) };
}

function apiDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function rangeLabel(range: DateRange) {
  const formatter = new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(range.from)} – ${formatter.format(range.to)}`;
}

function currency(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function change(current: number, previous: number) {
  return previous === 0
    ? current === 0
      ? 0
      : 100
    : ((current - previous) / previous) * 100;
}

function roundedPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function serviceId(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (/wash.*dry.*fold/.test(normalized)) return "wash-fold";
  if (/dry.*only/.test(normalized)) return "dry-only";
  if (/self.*service/.test(normalized)) return "self-service";
  if (/drop/.test(normalized)) return "drop-off";
  if (/pickup|delivery/.test(normalized)) return "pickup";
  return normalized;
}

function applyFilters(orders: OrderHistoryDto[], filters: ReportFilters) {
  return orders.filter((order) => {
    if (
      filters.fulfillment === "pickup" &&
      order.fulfillmentType !== "PickupAndDelivery"
    )
      return false;
    if (
      filters.fulfillment === "dropOff" &&
      order.fulfillmentType === "PickupAndDelivery"
    )
      return false;
    if (filters.payment === "paid" && order.paymentStatus !== "Paid")
      return false;
    if (filters.payment === "cod" && order.paymentStatus === "Paid")
      return false;
    if (filters.status === "completed" && order.status !== "Completed")
      return false;
    if (
      filters.status === "active" &&
      ["Completed", "Rejected"].includes(order.status)
    )
      return false;
    if (
      filters.service !== "all" &&
      serviceId(order.serviceName) !== filters.service
    )
      return false;
    return true;
  });
}

async function getOrders(range: DateRange) {
  return getAllPages<OrderHistoryDto>(
    `/api/reports/order-history?from=${apiDate(range.from)}&to=${apiDate(range.to)}`,
  );
}

async function getManualTransactions(range: DateRange) {
  const rows = await getAllPages<TransactionDto>(
    `/api/transactions?from=${apiDate(range.from)}&to=${apiDate(range.to)}&sort=Latest`,
  );
  return rows.filter(
    (row) => row.kind === "ManualIncome" || row.kind === "ManualDeduction",
  );
}

export async function getReportsDashboard(
  period: ReportPeriodId,
  filters: ReportFilters,
): Promise<ReportsDashboardData> {
  const range = rangeFor(period);
  const comparison = previousRange(range);
  const [currentRaw, previousRaw, currentTransactions, previousTransactions] =
    await Promise.all([
      getOrders(range),
      getOrders(comparison),
      getManualTransactions(range),
      getManualTransactions(comparison),
    ]);
  const current = applyFilters(currentRaw, filters);
  const previous = applyFilters(previousRaw, filters);
  const paid = current.filter((order) => order.paymentStatus === "Paid");
  const oldPaid = previous.filter((order) => order.paymentStatus === "Paid");
  const completed = current.filter((order) => order.status === "Completed");
  const oldCompleted = previous.filter((order) => order.status === "Completed");
  const grossSales = paid.reduce((sum, order) => sum + order.totalAmount, 0);
  const oldGrossSales = oldPaid.reduce(
    (sum, order) => sum + order.totalAmount,
    0,
  );
  const manualNet = currentTransactions.reduce(
    (sum, transaction) =>
      sum +
      (transaction.kind === "ManualDeduction"
        ? -transaction.amount
        : transaction.amount),
    0,
  );
  const oldManualNet = previousTransactions.reduce(
    (sum, transaction) =>
      sum +
      (transaction.kind === "ManualDeduction"
        ? -transaction.amount
        : transaction.amount),
    0,
  );
  const revenue = grossSales + manualNet;
  const oldRevenue = oldGrossSales + oldManualNet;
  const average = paid.length ? grossSales / paid.length : 0;
  const oldAverage = oldPaid.length ? oldGrossSales / oldPaid.length : 0;

  const grouped = new Map<string, { name: string; revenue: number }>();
  paid.forEach((order) => {
    const id = serviceId(order.serviceName);
    const item = grouped.get(id);
    grouped.set(id, {
      name: order.serviceName,
      revenue: (item?.revenue ?? 0) + order.totalAmount,
    });
  });
  const topServices = [...grouped.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 4)
    .map(([id, item], index) => ({
      ...serviceStyles[index % serviceStyles.length],
      id,
      name: item.name,
      percentage: grossSales
        ? roundedPercent((item.revenue / grossSales) * 100)
        : 0,
      revenue: item.revenue,
    }));

  const byDate = new Map<string, number>();
  paid.forEach((order) =>
    byDate.set(
      order.preferredDate,
      (byDate.get(order.preferredDate) ?? 0) + order.totalAmount,
    ),
  );
  currentTransactions.forEach((transaction) => {
    const key = apiDate(new Date(transaction.occurredAt));
    const signedAmount =
      transaction.kind === "ManualDeduction"
        ? -transaction.amount
        : transaction.amount;
    byDate.set(key, (byDate.get(key) ?? 0) + signedAmount);
  });
  const revenuePoints = [];
  for (
    let date = new Date(range.from);
    date <= range.to;
    date = addDays(date, 1)
  ) {
    revenuePoints.push({
      label: new Intl.DateTimeFormat("en-PH", { weekday: "short" }).format(
        date,
      ),
      value: byDate.get(apiDate(date)) ?? 0,
    });
  }

  const revenueTrend = change(revenue, oldRevenue);
  const metric = (
    id: string,
    icon: "calendar-outline" | "checkmark-circle-outline",
    label: string,
    value: number,
    oldValue: number,
  ) => {
    const trend = change(value, oldValue);
    return {
      id,
      icon,
      label,
      value: String(value),
      trendDirection:
        trend < 0
          ? ("down" as const)
          : trend > 0
            ? ("up" as const)
            : ("neutral" as const),
      trendPercent: roundedPercent(Math.abs(trend)),
    };
  };
  const averageTrend = change(average, oldAverage);
  return {
    comparisonLabel: `vs. ${rangeLabel(comparison)}`,
    metrics: [
      {
        id: "revenue",
        icon: "wallet-outline",
        label: "Net Revenue",
        value: currency(revenue),
        trendDirection:
          revenueTrend < 0 ? "down" : revenueTrend > 0 ? "up" : "neutral",
        trendPercent: roundedPercent(Math.abs(revenueTrend)),
      },
      metric(
        "bookings",
        "calendar-outline",
        "Total Bookings",
        current.length,
        previous.length,
      ),
      metric(
        "completed",
        "checkmark-circle-outline",
        "Completed Orders",
        completed.length,
        oldCompleted.length,
      ),
      {
        id: "average",
        icon: "stats-chart-outline",
        label: "Average Order Value",
        value: currency(average),
        trendDirection:
          averageTrend < 0 ? "down" : averageTrend > 0 ? "up" : "neutral",
        trendPercent: roundedPercent(Math.abs(averageTrend)),
      },
    ],
    periodLabel: rangeLabel(range),
    revenuePoints,
    revenueTotal: revenue,
    revenueTrendPercent: roundedPercent(Math.abs(revenueTrend)),
    topServices,
  };
}
