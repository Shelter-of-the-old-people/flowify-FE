import { type ServiceBadgeKey } from "@/shared";

export type DashboardMetricId =
  | "today-processed"
  | "total-processed"
  | "total-duration";

export type DashboardMetric = {
  id: DashboardMetricId;
  label: string;
  value: string;
};

export type DashboardIssueItem = {
  id: string;
  badgeKey: ServiceBadgeKey;
  message: string;
};

export type DashboardIssue = {
  id: string;
  name: string;
  isActive: boolean;
  startBadgeKey: ServiceBadgeKey;
  endBadgeKey: ServiceBadgeKey;
  relativeUpdateLabel: string;
  buildProgressLabel: string;
  items: DashboardIssueItem[];
};

export type DashboardServiceCard = {
  id: string;
  label: string;
  badgeKey: ServiceBadgeKey;
  statusLabel: string;
};
