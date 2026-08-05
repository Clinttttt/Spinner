export type HomeActivityType = "pickup" | "delivery" | "receipt";

export interface HomeActivity {
  id: string;
  type: HomeActivityType;
  title: string;
  subtitle: string;
  meta?: string;
  /** The order this activity refers to, so the row can open it. */
  orderCode?: string;
  badge?: string;
}

export interface HomeDashboardData {
  ownerName: string;
  pendingBookingCount: number;
  recentActivities: HomeActivity[];
}

export type DashboardViewState = "loading" | "ready" | "error";
