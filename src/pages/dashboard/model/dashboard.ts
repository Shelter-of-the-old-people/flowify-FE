import {
  type DashboardIssueResponse,
  type DashboardMetricsResponse,
} from "@/entities/dashboard";
import { isOAuthConnectSupported } from "@/entities/oauth-token";
import {
  type ServiceBadgeKey,
  getRelativeTimeLabel,
  getServiceBadgeKeyFromService,
} from "@/shared";

import {
  type DashboardIssue,
  type DashboardIssueItem,
  type DashboardMetric,
  type DashboardMetricId,
  type DashboardServiceCard,
} from "./types";

type SupportedServiceKey =
  | "calendar"
  | "canvas-lms"
  | "discord"
  | "gmail"
  | "google-drive"
  | "google-sheets"
  | "notion"
  | "slack";

type RecommendedDashboardService = {
  serviceKey: string;
  badgeKey: SupportedServiceKey;
  label: string;
};

type DashboardServiceLike = {
  service: string | null;
  connected: boolean;
  accountEmail?: string | null;
  expiresAt?: string | null;
  aliasOf?: string | null;
  disconnectable?: boolean | null;
  reason?: string | null;
};

const DASHBOARD_METRIC_LABELS: Record<DashboardMetricId, string> = {
  "today-processed": "오늘 처리량",
  "total-processed": "누적 처리량",
  "total-duration": "누적 실행 시간",
};

const DASHBOARD_SERVICE_LABELS: Record<SupportedServiceKey, string> = {
  calendar: "Google Calendar",
  "canvas-lms": "Canvas LMS",
  discord: "Discord",
  gmail: "Gmail",
  "google-drive": "Google Drive",
  "google-sheets": "Google Sheets",
  notion: "Notion",
  slack: "Slack",
};

const RECOMMENDED_DASHBOARD_SERVICES: RecommendedDashboardService[] = [
  {
    serviceKey: "canvas_lms",
    badgeKey: "canvas-lms",
    label: "Canvas LMS",
  },
  {
    serviceKey: "gmail",
    badgeKey: "gmail",
    label: "Gmail",
  },
  {
    serviceKey: "google_drive",
    badgeKey: "google-drive",
    label: "Google Drive",
  },
  {
    serviceKey: "notion",
    badgeKey: "notion",
    label: "Notion",
  },
  {
    serviceKey: "slack",
    badgeKey: "slack",
    label: "Slack",
  },
];

export const formatDashboardDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export const getDashboardMetrics = (
  metrics: DashboardMetricsResponse | null | undefined,
): DashboardMetric[] => [
  {
    id: "today-processed",
    label: DASHBOARD_METRIC_LABELS["today-processed"],
    value: String(metrics?.todayProcessedCount ?? 0),
  },
  {
    id: "total-processed",
    label: DASHBOARD_METRIC_LABELS["total-processed"],
    value: String(metrics?.totalProcessedCount ?? 0),
  },
  {
    id: "total-duration",
    label: DASHBOARD_METRIC_LABELS["total-duration"],
    value: formatDashboardDuration(metrics?.totalDurationMs ?? 0),
  },
];

const getServiceLabelFromBadgeKey = (badgeKey: ServiceBadgeKey) => {
  if (badgeKey in DASHBOARD_SERVICE_LABELS) {
    return DASHBOARD_SERVICE_LABELS[badgeKey as SupportedServiceKey];
  }

  return "Unknown";
};

const getIssueMessage = (issue: DashboardIssueResponse) =>
  issue.message?.trim() || issue.type || "Issue";

const getIssueName = (issue: DashboardIssueResponse) =>
  issue.workflowName?.trim() || getIssueMessage(issue) || "Workflow";

const getIssueItemMessage = (
  item: DashboardIssueItemResponse,
  fallbackMessage: string,
) => item.message?.trim() || fallbackMessage || "Issue";

type DashboardIssueItemResponse = DashboardIssueResponse["items"][number];

const getDashboardIssueItems = (
  issue: DashboardIssueResponse,
): DashboardIssueItem[] => {
  const fallbackMessage = getIssueMessage(issue);

  if (issue.items.length === 0) {
    return [
      {
        id: `${issue.id}-message`,
        badgeKey: "unknown",
        message: fallbackMessage,
      },
    ];
  }

  return issue.items.map((item) => ({
    id: item.id,
    badgeKey: getServiceBadgeKeyFromService(item.service),
    message: getIssueItemMessage(item, fallbackMessage),
  }));
};

export const getDashboardIssuesFromSummary = (
  issues: DashboardIssueResponse[] | null | undefined,
): DashboardIssue[] =>
  (issues ?? []).map((issue) => {
    const issueMessage = getIssueMessage(issue);

    return {
      id: issue.id,
      workflowId: issue.workflowId,
      name: getIssueName(issue),
      isActive: issue.isActive,
      startBadgeKey: getServiceBadgeKeyFromService(issue.startService),
      endBadgeKey: getServiceBadgeKeyFromService(issue.endService),
      relativeUpdateLabel: getRelativeTimeLabel(issue.occurredAt ?? "", {
        suffix: "발생",
      }),
      buildProgressLabel: issueMessage,
      items: getDashboardIssueItems(issue),
    };
  });

const getServiceKey = (service: DashboardServiceLike) =>
  service.service?.trim() ?? "";

const getConnectedServiceStatusLabel = (service: DashboardServiceLike) => {
  if (service.accountEmail?.trim()) {
    return service.accountEmail.trim();
  }

  if (service.aliasOf?.trim()) {
    return `${service.aliasOf.trim()} 연결 사용`;
  }

  if (service.reason?.trim()) {
    return service.reason.trim();
  }

  return "연결됨";
};

export const getConnectedServiceCards = (
  services: DashboardServiceLike[] | null | undefined,
) =>
  (services ?? [])
    .filter((service) => service.connected && getServiceKey(service).length > 0)
    .map<DashboardServiceCard>((service) => {
      const serviceKey = getServiceKey(service);
      const badgeKey = getServiceBadgeKeyFromService(serviceKey);

      return {
        id: `connected-${serviceKey}`,
        label:
          badgeKey === "unknown"
            ? serviceKey
            : getServiceLabelFromBadgeKey(badgeKey),
        badgeKey,
        serviceKey,
        statusLabel: getConnectedServiceStatusLabel(service),
        actionKind: "disconnect",
        actionLabel:
          service.disconnectable === false ? "해제 불가" : "연결 해제",
        actionDisabled: service.disconnectable === false,
        disabledReason:
          service.disconnectable === false
            ? "다른 서비스 연결을 공유하고 있어 직접 해제할 수 없습니다."
            : undefined,
      };
    });

export const getRecommendedServiceCards = (
  services: DashboardServiceLike[] | null | undefined,
) => {
  const connectedServiceKeys = new Set(
    (services ?? [])
      .filter((service) => service.connected)
      .map(getServiceKey)
      .filter(Boolean),
  );

  return RECOMMENDED_DASHBOARD_SERVICES.filter(({ serviceKey }) => {
    return (
      isOAuthConnectSupported(serviceKey) &&
      !connectedServiceKeys.has(serviceKey)
    );
  }).map<DashboardServiceCard>(({ serviceKey, badgeKey, label }) => ({
    id: `recommended-${serviceKey}`,
    label,
    badgeKey,
    serviceKey,
    statusLabel: "인증 필요",
    actionKind: "connect",
    actionLabel: "연결 시작",
  }));
};
