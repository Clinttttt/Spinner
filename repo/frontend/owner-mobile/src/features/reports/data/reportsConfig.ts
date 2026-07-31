import type { ReportFilters, ReportPeriodId } from "../models/reports";

export const reportServiceColors = {
  blueLight: "#6FAEF8",
  lavender: "#6B3FD6",
  lavenderLight: "#9B7BEA",
  primaryBlue: "#1769E0",
} as const;

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function reportRangeLabel(from: Date, to: Date) {
  const formatter = new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(from)} – ${formatter.format(to)}`;
}

const today = new Date();
today.setHours(0, 0, 0, 0);
const monday = addDays(today, -(today.getDay() === 0 ? 6 : today.getDay() - 1));
const currentWeek = { from: monday, to: addDays(monday, 6) };
const previousWeek = {
  from: addDays(monday, -7),
  to: addDays(monday, -1),
};
const priorWeek = {
  from: addDays(monday, -14),
  to: addDays(monday, -8),
};
const monthToDate = {
  from: new Date(today.getFullYear(), today.getMonth(), 1),
  to: today,
};
const previousMonth = {
  from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
  to: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
};

export const reportPeriodOptions: {
  comparisonLabel: string;
  id: ReportPeriodId;
  label: string;
}[] = [
  {
    comparisonLabel: `vs. ${reportRangeLabel(previousWeek.from, previousWeek.to)}`,
    id: "currentWeek",
    label: reportRangeLabel(currentWeek.from, currentWeek.to),
  },
  {
    comparisonLabel: `vs. ${reportRangeLabel(priorWeek.from, priorWeek.to)}`,
    id: "previousWeek",
    label: reportRangeLabel(previousWeek.from, previousWeek.to),
  },
  {
    comparisonLabel: `vs. ${reportRangeLabel(previousMonth.from, previousMonth.to)}`,
    id: "monthToDate",
    label: reportRangeLabel(monthToDate.from, monthToDate.to),
  },
];

export const defaultReportFilters: ReportFilters = {
  fulfillment: "all",
  payment: "all",
  service: "all",
  status: "all",
};
