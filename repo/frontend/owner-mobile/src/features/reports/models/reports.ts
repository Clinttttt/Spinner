export type ReportTrendDirection = "up" | "down" | "neutral";

export type ReportIconName =
  | "wallet-outline"
  | "calendar-outline"
  | "checkmark-circle-outline"
  | "stats-chart-outline"
  | "shirt-outline"
  | "car-outline"
  | "water-outline";

export type ReportServiceColorKey =
  "primaryBlue" | "blueLight" | "lavender" | "lavenderLight";

export interface ReportMetric {
  id: string;
  icon: ReportIconName;
  label: string;
  trendDirection: ReportTrendDirection;
  trendPercent: number;
  value: string;
}

export interface RevenuePoint {
  label: string;
  value: number;
}

export interface TopServiceReport {
  colorKey: ReportServiceColorKey;
  icon: ReportIconName;
  id: string;
  name: string;
  percentage: number;
  revenue: number;
}

export interface ReportsDashboardData {
  comparisonLabel: string;
  metrics: ReportMetric[];
  periodLabel: string;
  revenuePoints: RevenuePoint[];
  revenueTotal: number;
  revenueTrendPercent: number;
  topServices: TopServiceReport[];
}

export type ReportsViewState = "loading" | "ready" | "empty" | "error";
export type ReportPeriodId = "currentWeek" | "previousWeek" | "monthToDate";
export type ReportServiceFilter = "all" | TopServiceReport["id"];

export interface ReportFilters {
  fulfillment: "all" | "pickup" | "dropOff";
  payment: "all" | "cod" | "paid";
  service: ReportServiceFilter;
  status: "all" | "completed" | "active";
}
