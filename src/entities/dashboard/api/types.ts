export type DashboardSummaryResponse = {
  metrics: DashboardMetricsResponse;
  issues: DashboardIssueResponse[];
  services: DashboardServiceResponse[];
};

export type DashboardMetricsResponse = {
  todayProcessedCount: number;
  totalProcessedCount: number;
  totalDurationMs: number;
};

export type DashboardIssueResponse = {
  id: string;
  type: "EXECUTION_FAILED" | "WORKFLOW_NOT_EXECUTABLE" | string;
  workflowId: string;
  workflowName: string | null;
  isActive: boolean;
  startService: string | null;
  endService: string | null;
  occurredAt: string | null;
  message: string | null;
  items: DashboardIssueItemResponse[];
};

export type DashboardIssueItemResponse = {
  id: string;
  service: string | null;
  message: string | null;
};

export type DashboardServiceResponse = {
  service: string | null;
  connected: boolean;
  accountEmail: string | null;
  expiresAt: string | null;
  aliasOf: string | null;
  disconnectable: boolean | null;
  reason: string | null;
};
